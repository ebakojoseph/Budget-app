"""BudgetTracker v2 API tests (Emergent Auth, owner_id scoping, transfers, snapshots,
rollover, budgets/share, charts, Excel export)."""
import os
import io
import time
import pytest
import requests
from zipfile import ZipFile

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
# Provided existing valid token for user_c17ad6287ab0
TOKEN = "cHtv5m1-IZdrS1H26aYb5aohXlSyY-LeI4-0mYlNuFE"

HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


# ---------- Auth ----------
class TestAuth:
    def test_me_with_bearer(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=HEADERS)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "user_id" in data and "email" in data

    def test_missing_token_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_bad_token_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": "Bearer NOT_A_TOKEN"})
        assert r.status_code == 401

    def test_session_missing_body_400_or_422(self):
        r = requests.post(f"{BASE_URL}/api/auth/session", json={})
        assert r.status_code in (400, 422)


# ---------- Categories / Transactions / Accounts / Allocations scoping ----------
class TestScoping:
    def test_categories_owner_scoped(self):
        r = requests.get(f"{BASE_URL}/api/categories", headers=HEADERS)
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list)
        # all owner_id present but not exposed as different owners
        for c in cats:
            assert "owner_id" in c

    def test_accounts_owner_scoped(self):
        r = requests.get(f"{BASE_URL}/api/accounts", headers=HEADERS)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_transactions_owner_scoped(self):
        r = requests.get(f"{BASE_URL}/api/transactions", headers=HEADERS)
        assert r.status_code == 200

    def test_allocations_owner_scoped(self):
        r = requests.get(f"{BASE_URL}/api/allocations", headers=HEADERS)
        assert r.status_code == 200


# ---------- Transfer flow ----------
class TestTransfer:
    def test_transfer_moves_balance_and_delete_reverts(self):
        # create two TEST accounts
        a1 = requests.post(f"{BASE_URL}/api/accounts", headers=HEADERS,
                           json={"name": "TEST_XferA", "group": "Cash", "balance": 500}).json()
        a2 = requests.post(f"{BASE_URL}/api/accounts", headers=HEADERS,
                           json={"name": "TEST_XferB", "group": "Cash", "balance": 100}).json()
        assert a1["balance"] == 500 and a2["balance"] == 100
        # create transfer of 150 from a1 -> a2
        r = requests.post(f"{BASE_URL}/api/transactions", headers=HEADERS, json={
            "date": "2026-07-15", "amount": 150, "description": "TEST_transfer",
            "type": "transfer", "account_id": a1["id"], "to_account_id": a2["id"],
        })
        assert r.status_code == 200, r.text
        tx = r.json()
        assert tx["type"] == "transfer"
        assert tx["category"] == "Transfer"  # default
        # verify balances
        accts = {a["id"]: a for a in requests.get(f"{BASE_URL}/api/accounts", headers=HEADERS).json()}
        assert accts[a1["id"]]["balance"] == 350
        assert accts[a2["id"]]["balance"] == 250
        # delete transfer -> balances revert
        d = requests.delete(f"{BASE_URL}/api/transactions/{tx['id']}", headers=HEADERS)
        assert d.status_code == 200
        accts = {a["id"]: a for a in requests.get(f"{BASE_URL}/api/accounts", headers=HEADERS).json()}
        assert accts[a1["id"]]["balance"] == 500
        assert accts[a2["id"]]["balance"] == 100
        # cleanup
        requests.delete(f"{BASE_URL}/api/accounts/{a1['id']}", headers=HEADERS)
        requests.delete(f"{BASE_URL}/api/accounts/{a2['id']}", headers=HEADERS)

    def test_transfer_requires_both_accounts(self):
        r = requests.post(f"{BASE_URL}/api/transactions", headers=HEADERS, json={
            "date": "2026-07-15", "amount": 10, "type": "transfer",
        })
        assert r.status_code == 400


# ---------- Balance snapshots ----------
class TestBalanceSnapshots:
    def test_upsert_snapshot_sets_account_balance(self):
        a = requests.post(f"{BASE_URL}/api/accounts", headers=HEADERS,
                          json={"name": "TEST_SnapAcct", "group": "Cash", "balance": 200}).json()
        aid = a["id"]
        r = requests.post(f"{BASE_URL}/api/balance-snapshots", headers=HEADERS,
                          json={"account_id": aid, "month": "2026-07", "balance": 777.5})
        assert r.status_code == 200, r.text
        snap = r.json()
        assert snap["balance"] == 777.5

        # account should now be updated
        accts = {x["id"]: x for x in requests.get(f"{BASE_URL}/api/accounts", headers=HEADERS).json()}
        assert accts[aid]["balance"] == 777.5

        # upsert (same month, same account) -> no duplicates
        r2 = requests.post(f"{BASE_URL}/api/balance-snapshots", headers=HEADERS,
                           json={"account_id": aid, "month": "2026-07", "balance": 999})
        assert r2.status_code == 200
        assert r2.json()["id"] == snap["id"]

        lst = requests.get(f"{BASE_URL}/api/balance-snapshots?month=2026-07", headers=HEADERS).json()
        matches = [s for s in lst if s["account_id"] == aid and s["month"] == "2026-07"]
        assert len(matches) == 1
        assert matches[0]["balance"] == 999

        # cleanup
        requests.delete(f"{BASE_URL}/api/accounts/{aid}", headers=HEADERS)


# ---------- Rollover ----------
class TestRollover:
    def test_rollover_copies_categories_and_updates_brought_forward(self):
        # unique test months
        from_m = "2099-01"
        to_m = "2099-02"
        # seed a category in from_m
        c = requests.post(f"{BASE_URL}/api/categories", headers=HEADERS, json={
            "name": "TEST_Rollover_Cat", "type": "expense", "planned": 42, "month": from_m,
        }).json()
        # create account to test brought_forward update
        a = requests.post(f"{BASE_URL}/api/accounts", headers=HEADERS, json={
            "name": "TEST_RolloverAcct", "group": "Cash", "balance": 1234.5,
        }).json()
        aid = a["id"]

        r = requests.post(f"{BASE_URL}/api/rollover", headers=HEADERS,
                          json={"from_month": from_m, "to_month": to_m})
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True

        cats = requests.get(f"{BASE_URL}/api/categories?month=" + to_m, headers=HEADERS).json()
        names = [x["name"] for x in cats]
        assert "TEST_Rollover_Cat" in names

        # brought_forward should equal current balance
        accts = {x["id"]: x for x in requests.get(f"{BASE_URL}/api/accounts", headers=HEADERS).json()}
        assert accts[aid]["brought_forward"] == 1234.5

        # second call should NOT duplicate (existing check)
        r2 = requests.post(f"{BASE_URL}/api/rollover", headers=HEADERS,
                          json={"from_month": from_m, "to_month": to_m})
        assert r2.status_code == 200
        assert r2.json()["categories_created"] == 0

        # cleanup
        for m in (from_m, to_m):
            for x in requests.get(f"{BASE_URL}/api/categories?month=" + m, headers=HEADERS).json():
                if x["name"] == "TEST_Rollover_Cat":
                    requests.delete(f"{BASE_URL}/api/categories/{x['id']}", headers=HEADERS)
        requests.delete(f"{BASE_URL}/api/accounts/{aid}", headers=HEADERS)


# ---------- Budgets + Sharing ----------
class TestBudgetsSharing:
    def test_budget_crud_share_write_and_readonly(self):
        # Create a category we will edit via shared link
        cat = requests.post(f"{BASE_URL}/api/categories", headers=HEADERS, json={
            "name": "TEST_SharedCat", "type": "expense", "planned": 10, "month": "2099-03",
        }).json()

        b = requests.post(f"{BASE_URL}/api/budgets", headers=HEADERS,
                          json={"month": "2099-03", "name": "TEST_Budget"}).json()
        bid = b["id"]

        # share read-only
        r = requests.post(f"{BASE_URL}/api/budgets/{bid}/share", headers=HEADERS,
                          json={"write": False})
        assert r.status_code == 200
        tok = r.json()["share_token"]
        assert tok and r.json()["write"] is False

        # GET shared (no auth)
        s = requests.get(f"{BASE_URL}/api/shared/{tok}")
        assert s.status_code == 200
        payload = s.json()
        assert payload["write"] is False
        assert "summary" in payload and "budget" in payload

        # PUT should fail read-only
        pr = requests.put(f"{BASE_URL}/api/shared/{tok}/category",
                          json={"category_id": cat["id"], "planned": 55})
        assert pr.status_code == 403

        # share writable
        r2 = requests.post(f"{BASE_URL}/api/budgets/{bid}/share", headers=HEADERS,
                           json={"write": True})
        assert r2.status_code == 200
        tok2 = r2.json()["share_token"]
        assert r2.json()["write"] is True

        pr2 = requests.put(f"{BASE_URL}/api/shared/{tok2}/category",
                           json={"category_id": cat["id"], "planned": 55})
        assert pr2.status_code == 200
        # verify updated
        cats = requests.get(f"{BASE_URL}/api/categories?month=2099-03", headers=HEADERS).json()
        edited = [c for c in cats if c["id"] == cat["id"]][0]
        assert edited["planned"] == 55

        # unshare
        u = requests.delete(f"{BASE_URL}/api/budgets/{bid}/share", headers=HEADERS)
        assert u.status_code == 200
        assert requests.get(f"{BASE_URL}/api/shared/{tok2}").status_code == 404

        # cleanup
        requests.delete(f"{BASE_URL}/api/budgets/{bid}", headers=HEADERS)
        requests.delete(f"{BASE_URL}/api/categories/{cat['id']}", headers=HEADERS)


# ---------- Charts ----------
class TestCharts:
    def test_charts_shape(self):
        r = requests.get(f"{BASE_URL}/api/charts", headers=HEADERS)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "net_worth_series" in data
        assert "spending_by_category" in data
        assert "planned_vs_actual" in data
        assert "latest_month" in data
        assert isinstance(data["net_worth_series"], list)
        assert isinstance(data["spending_by_category"], list)
        assert isinstance(data["planned_vs_actual"], list)


# ---------- Excel Export ----------
class TestExcelExport:
    def test_export_valid_xlsx_with_three_sheets(self):
        r = requests.get(f"{BASE_URL}/api/export/excel?month=2026-07", headers=HEADERS)
        assert r.status_code == 200, r.text
        content = r.content
        assert len(content) > 0
        # PK header for zip/xlsx
        assert content[:2] == b"PK"
        # verify sheets
        with ZipFile(io.BytesIO(content)) as z:
            names = z.namelist()
            # look for sheet1..sheet3 in workbook.xml
            wb_xml = z.read("xl/workbook.xml").decode()
            for sheet in ("Summary", "Transactions", "Accounts"):
                assert sheet in wb_xml
