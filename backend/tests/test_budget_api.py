"""Backend tests for July 2026 Budget API."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://spreadsheet-mobile-20.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Months ----------
def test_months(s):
    r = s.get(f"{API}/months")
    assert r.status_code == 200
    data = r.json()
    assert "months" in data and isinstance(data["months"], list)
    assert "2026-07" in data["months"]


# ---------- Summary ----------
def test_summary_july(s):
    r = s.get(f"{API}/summary", params={"month": "2026-07"})
    assert r.status_code == 200
    d = r.json()
    for k in ["starting_balance", "end_balance", "saved_this_month",
              "planned_expense", "actual_expense", "planned_income",
              "actual_income", "categories"]:
        assert k in d, f"missing {k}"
    assert isinstance(d["categories"], list)
    assert len(d["categories"]) > 0
    # each category should have actual & diff
    sample = d["categories"][0]
    assert "actual" in sample and "diff" in sample
    # sanity: saved = income - expense
    assert round(d["actual_income"] - d["actual_expense"], 2) == round(d["saved_this_month"], 2)


# ---------- Categories ----------
def test_list_categories(s):
    r = s.get(f"{API}/categories", params={"month": "2026-07"})
    assert r.status_code == 200
    cats = r.json()
    types = {c["type"] for c in cats}
    assert "expense" in types and "income" in types
    assert len(cats) >= 30  # 26 expense + 11 income


def test_category_crud(s):
    payload = {"name": "TEST_Cat", "type": "expense", "planned": 42.5, "month": "2026-07"}
    r = s.post(f"{API}/categories", json=payload)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    # update
    r2 = s.put(f"{API}/categories/{cid}", json={"planned": 99.0, "name": "TEST_Cat2"})
    assert r2.status_code == 200
    assert r2.json()["planned"] == 99.0
    assert r2.json()["name"] == "TEST_Cat2"
    # verify via GET list
    r3 = s.get(f"{API}/categories", params={"month": "2026-07"})
    assert any(c["id"] == cid and c["planned"] == 99.0 for c in r3.json())
    # delete
    r4 = s.delete(f"{API}/categories/{cid}")
    assert r4.status_code == 200
    r5 = s.get(f"{API}/categories", params={"month": "2026-07"})
    assert not any(c["id"] == cid for c in r5.json())


# ---------- Transactions ----------
def test_list_transactions(s):
    r = s.get(f"{API}/transactions")
    assert r.status_code == 200
    txs = r.json()
    assert len(txs) >= 9


def test_transaction_crud_and_month(s):
    payload = {"date": "2026-08-15", "amount": 25.5, "description": "TEST_tx",
               "category": "Food and Drinks", "type": "expense"}
    r = s.post(f"{API}/transactions", json=payload)
    assert r.status_code == 200, r.text
    tx = r.json()
    assert tx["month"] == "2026-08"  # month derived from date
    tid = tx["id"]
    # update date, month must change
    r2 = s.put(f"{API}/transactions/{tid}", json={"date": "2026-09-10", "amount": 30.0})
    assert r2.status_code == 200
    assert r2.json()["month"] == "2026-09"
    assert r2.json()["amount"] == 30.0
    # verify
    r3 = s.get(f"{API}/transactions", params={"month": "2026-09"})
    assert any(t["id"] == tid for t in r3.json())
    # delete
    assert s.delete(f"{API}/transactions/{tid}").status_code == 200
    r5 = s.get(f"{API}/transactions", params={"month": "2026-09"})
    assert not any(t["id"] == tid for t in r5.json())


# ---------- Accounts ----------
def test_list_accounts(s):
    r = s.get(f"{API}/accounts")
    assert r.status_code == 200
    accts = r.json()
    assert len(accts) == 20
    groups = {a["group"] for a in accts}
    for g in ["Cash", "Registered", "Investment", "Crypto", "Other"]:
        assert g in groups, f"missing group {g}"


def test_account_crud(s):
    r = s.post(f"{API}/accounts", json={"name": "TEST_Acc", "group": "Cash", "balance": 10.0})
    assert r.status_code == 200
    aid = r.json()["id"]
    r2 = s.put(f"{API}/accounts/{aid}", json={"balance": 55.0, "name": "TEST_Acc2"})
    assert r2.status_code == 200 and r2.json()["balance"] == 55.0
    # verify
    r3 = s.get(f"{API}/accounts")
    assert any(a["id"] == aid and a["balance"] == 55.0 for a in r3.json())
    assert s.delete(f"{API}/accounts/{aid}").status_code == 200


# ---------- Allocations ----------
def test_list_allocations(s):
    r = s.get(f"{API}/allocations")
    assert r.status_code == 200
    allocs = r.json()
    assert len(allocs) == 9
    names = {a["name"] for a in allocs}
    for n in ["EF", "Grow", "FHSA", "RRSP", "RESP", "EJ TFSA", "PJ TFSA", "Non-Registered", "Crypto"]:
        assert n in names


def test_update_allocation(s):
    allocs = s.get(f"{API}/allocations").json()
    a = next(x for x in allocs if x["name"] == "EF")
    original = a["percent"]
    r = s.put(f"{API}/allocations/{a['id']}", json={"percent": 0.07})
    assert r.status_code == 200 and r.json()["percent"] == 0.07
    # revert
    s.put(f"{API}/allocations/{a['id']}", json={"percent": original})
