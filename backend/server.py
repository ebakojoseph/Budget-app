from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# =================== MODELS ===================

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: Literal["expense", "income"]
    planned: float = 0.0
    month: str  # YYYY-MM

class CategoryCreate(BaseModel):
    name: str
    type: Literal["expense", "income"]
    planned: float = 0.0
    month: str

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    planned: Optional[float] = None


class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD
    amount: float
    description: str = ""
    category: str
    type: Literal["expense", "income"]
    month: str  # YYYY-MM

class TransactionCreate(BaseModel):
    date: str
    amount: float
    description: str = ""
    category: str
    type: Literal["expense", "income"]

class TransactionUpdate(BaseModel):
    date: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None


class Account(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    group: str  # "Registered", "Cash", "Crypto", "Investment", "Other"
    balance: float
    brought_forward: float = 0.0

class AccountCreate(BaseModel):
    name: str
    group: str
    balance: float = 0.0
    brought_forward: float = 0.0

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    group: Optional[str] = None
    balance: Optional[float] = None


class Allocation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    percent: float  # 0.0 - 1.0

class AllocationUpdate(BaseModel):
    percent: float


# =================== HELPERS ===================

def clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


# =================== CATEGORY ROUTES ===================

@api_router.get("/categories", response_model=List[Category])
async def list_categories(month: Optional[str] = None):
    q = {"month": month} if month else {}
    docs = await db.categories.find(q, {"_id": 0}).to_list(1000)
    return [Category(**d) for d in docs]

@api_router.post("/categories", response_model=Category)
async def create_category(body: CategoryCreate):
    obj = Category(**body.dict())
    await db.categories.insert_one(obj.dict())
    return obj

@api_router.put("/categories/{cat_id}", response_model=Category)
async def update_category(cat_id: str, body: CategoryUpdate):
    update = {k: v for k, v in body.dict().items() if v is not None}
    if not update:
        raise HTTPException(400, "no fields")
    await db.categories.update_one({"id": cat_id}, {"$set": update})
    doc = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "not found")
    return Category(**doc)

@api_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str):
    await db.categories.delete_one({"id": cat_id})
    return {"ok": True}


# =================== TRANSACTION ROUTES ===================

@api_router.get("/transactions", response_model=List[Transaction])
async def list_transactions(month: Optional[str] = None, type: Optional[str] = None):
    q = {}
    if month:
        q["month"] = month
    if type:
        q["type"] = type
    docs = await db.transactions.find(q, {"_id": 0}).sort("date", -1).to_list(2000)
    return [Transaction(**d) for d in docs]

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(body: TransactionCreate):
    month = body.date[:7]
    obj = Transaction(**body.dict(), month=month)
    await db.transactions.insert_one(obj.dict())
    return obj

@api_router.put("/transactions/{tx_id}", response_model=Transaction)
async def update_transaction(tx_id: str, body: TransactionUpdate):
    update = {k: v for k, v in body.dict().items() if v is not None}
    if "date" in update:
        update["month"] = update["date"][:7]
    if not update:
        raise HTTPException(400, "no fields")
    await db.transactions.update_one({"id": tx_id}, {"$set": update})
    doc = await db.transactions.find_one({"id": tx_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "not found")
    return Transaction(**doc)

@api_router.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: str):
    await db.transactions.delete_one({"id": tx_id})
    return {"ok": True}


# =================== ACCOUNT ROUTES ===================

@api_router.get("/accounts", response_model=List[Account])
async def list_accounts():
    docs = await db.accounts.find({}, {"_id": 0}).to_list(1000)
    return [Account(**d) for d in docs]

@api_router.post("/accounts", response_model=Account)
async def create_account(body: AccountCreate):
    obj = Account(**body.dict())
    await db.accounts.insert_one(obj.dict())
    return obj

@api_router.put("/accounts/{acc_id}", response_model=Account)
async def update_account(acc_id: str, body: AccountUpdate):
    update = {k: v for k, v in body.dict().items() if v is not None}
    if not update:
        raise HTTPException(400, "no fields")
    await db.accounts.update_one({"id": acc_id}, {"$set": update})
    doc = await db.accounts.find_one({"id": acc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "not found")
    return Account(**doc)

@api_router.delete("/accounts/{acc_id}")
async def delete_account(acc_id: str):
    await db.accounts.delete_one({"id": acc_id})
    return {"ok": True}


# =================== ALLOCATION ROUTES ===================

@api_router.get("/allocations", response_model=List[Allocation])
async def list_allocations():
    docs = await db.allocations.find({}, {"_id": 0}).to_list(100)
    return [Allocation(**d) for d in docs]

@api_router.put("/allocations/{alloc_id}", response_model=Allocation)
async def update_allocation(alloc_id: str, body: AllocationUpdate):
    await db.allocations.update_one({"id": alloc_id}, {"$set": {"percent": body.percent}})
    doc = await db.allocations.find_one({"id": alloc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "not found")
    return Allocation(**doc)


# =================== SUMMARY ===================

@api_router.get("/summary")
async def get_summary(month: str):
    cats = await db.categories.find({"month": month}, {"_id": 0}).to_list(1000)
    txs = await db.transactions.find({"month": month}, {"_id": 0}).to_list(2000)
    accounts = await db.accounts.find({}, {"_id": 0}).to_list(1000)

    planned_expense = sum(c["planned"] for c in cats if c["type"] == "expense")
    planned_income = sum(c["planned"] for c in cats if c["type"] == "income")
    actual_expense = sum(t["amount"] for t in txs if t["type"] == "expense")
    actual_income = sum(t["amount"] for t in txs if t["type"] == "income")

    # starting balance = sum of brought_forward across accounts
    starting_balance = sum(a.get("brought_forward", 0) for a in accounts)
    saved_this_month = actual_income - actual_expense
    end_balance = starting_balance + saved_this_month

    # per-category actual
    cat_actual = {}
    for t in txs:
        cat_actual[t["category"]] = cat_actual.get(t["category"], 0) + t["amount"]

    categories_with_actual = []
    for c in cats:
        categories_with_actual.append({
            **c,
            "actual": round(cat_actual.get(c["name"], 0), 2),
            "diff": round(c["planned"] - cat_actual.get(c["name"], 0), 2),
        })

    return {
        "month": month,
        "starting_balance": round(starting_balance, 2),
        "end_balance": round(end_balance, 2),
        "saved_this_month": round(saved_this_month, 2),
        "planned_expense": round(planned_expense, 2),
        "actual_expense": round(actual_expense, 2),
        "planned_income": round(planned_income, 2),
        "actual_income": round(actual_income, 2),
        "categories": categories_with_actual,
    }


@api_router.get("/months")
async def get_months():
    """Distinct months across transactions + categories."""
    tx_months = await db.transactions.distinct("month")
    cat_months = await db.categories.distinct("month")
    months = sorted(set(tx_months + cat_months), reverse=True)
    if not months:
        months = [datetime.now(timezone.utc).strftime("%Y-%m")]
    return {"months": months}


# =================== SEED ===================

@api_router.post("/seed")
async def seed():
    """Seed from July 2026 Budget workbook. Idempotent."""
    existing = await db.categories.count_documents({})
    if existing > 0:
        return {"ok": True, "seeded": False, "message": "already seeded"}

    month = "2026-07"

    expense_cats = [
        ("Growth", 2000), ("Food and Drinks", 1000), ("Home Internet", 78.75),
        ("Offering", 100), ("Rent", 2300), ("Transport", 100),
        ("Emergency funds", 614.93), ("Family and Friends Gift", 200),
        ("Daycare and OSC", 652.5), ("Communication", 113.35),
        ("Intertainment (Netflix)", 0), ("Fuel", 100), ("House supplies", 150),
        ("Miscellaneous", 100), ("House Furniture", 150), ("School Bus", 0),
        ("Health", 50), ("Outings", 200), ("PJ Allowance", 300),
        ("Utility", 370), ("Amazon Prime", 0), ("Car insurance", 293.1),
        ("Children supplies", 100), ("EJ Allowance", 200),
        ("Traffic Fine", 0), ("Canadian Tire", 35.83),
    ]
    income_cats = [
        ("SOFRECO", 3947.671), ("EI", 1380), ("CCB", 1580.8), ("GST/HST", 0),
        ("CCR", 0), ("ACFB", 0), ("TP", 2500), ("Debt repayment", 0),
        ("Others", 0), ("Brought forward", 0), ("Emergency Fund", 0),
    ]

    for name, planned in expense_cats:
        await db.categories.insert_one(Category(name=name, type="expense", planned=planned, month=month).dict())
    for name, planned in income_cats:
        await db.categories.insert_one(Category(name=name, type="income", planned=planned, month=month).dict())

    txs = [
        ("2026-06-29", 319.47, "Kasoa", "Food and Drinks", "expense"),
        ("2026-06-29", 333.84, "Costco", "Food and Drinks", "expense"),
        ("2026-06-29", 50.0, "Walmart", "Food and Drinks", "expense"),
        ("2026-07-05", 28.95, "H&W", "Food and Drinks", "expense"),
        ("2026-07-06", 103.97, "Footwear", "PJ Allowance", "expense"),
        ("2026-07-06", 100.24, "Footwear", "Children supplies", "expense"),
        ("2026-07-07", 1525.05, "TP Pay", "TP", "income"),
        ("2026-07-02", 3947.671, "Ginger Sofreco", "SOFRECO", "income"),
        ("2026-07-07", 690.0, "EI Payment", "EI", "income"),
    ]
    for date, amount, desc, cat, t in txs:
        m = date[:7]
        await db.transactions.insert_one(
            Transaction(date=date, amount=amount, description=desc, category=cat, type=t, month=m).dict()
        )

    accounts = [
        ("EJ SB Current Account", "Cash", 299.27),
        ("WS Emergency", "Cash", 9843.86),
        ("CN Shares", "Investment", 4026.23),
        ("CN Shares Match", "Investment", 734.49),
        ("EJ Scotia Savings", "Cash", 125.68),
        ("EJ TFSA Portfolio", "Registered", 149.5),
        ("TFSA General", "Registered", 4868.42),
        ("Tax Cash TFSA", "Registered", 4564.16),
        ("PJ Tax TFSA", "Registered", 0.0),
        ("Non Registered Margin", "Investment", 778.91),
        ("EJ TFSA Finance", "Registered", 259.82),
        ("EJ RRSP", "Registered", 4172.61),
        ("EJ FHSA", "Registered", 6948.38),
        ("Crypto Wise", "Crypto", 170.9),
        ("RESP", "Registered", 5726.81),
        ("PJ SC Checking Account", "Cash", 527.0),
        ("PJ Savings SC", "Cash", 107.78),
        ("PJ WS CA", "Cash", 10911.07),
        ("Cash holding", "Cash", 175.0),
        ("Senegal Ecobank", "Other", 0.0),
    ]
    for name, group, bal in accounts:
        await db.accounts.insert_one(
            Account(name=name, group=group, balance=bal, brought_forward=bal).dict()
        )

    allocations = [
        ("EF", 0.05), ("Grow", 0.15), ("FHSA", 0.30),
        ("RRSP", 0.10), ("RESP", 0.10), ("EJ TFSA", 0.10),
        ("PJ TFSA", 0.30), ("Non-Registered", 0.0), ("Crypto", 0.10),
    ]
    for name, pct in allocations:
        await db.allocations.insert_one(Allocation(name=name, percent=pct).dict())

    return {"ok": True, "seeded": True}


@api_router.get("/")
async def root():
    return {"message": "Budget API v1"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    """Auto-seed on first startup."""
    try:
        count = await db.categories.count_documents({})
        if count == 0:
            await seed()
            logger.info("Auto-seeded initial data")
    except Exception as e:
        logger.error(f"Seed error: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
