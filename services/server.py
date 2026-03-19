"""
FastAPI server to provide the backend for the AuditAI / Financial Navigator GUI.
Supports the /api/v1/stats, /api/v1/drivers, and /api/v1/scenarios/simulate endpoints.
"""

from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import io
import os
import json
import logging
import config
from intelligence_engine import IntelligenceEngine
import app_db
from formula_graph import garage_template

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Engine
model_path = os.path.join(config.BASE_DIR, "models", "financial_classifier.joblib")
engine = IntelligenceEngine(model_path=model_path)

# Initialize persistent storage
app_db.init_db()
DEFAULT_COMPANY_ID = app_db.ensure_default_company()
GARAGE_GRAPH = garage_template()

# Pydantic Models
class TransactionItem(BaseModel):
    date: str
    description: str
    amount: float

class Adjustment(BaseModel):
    driver_id: str
    adjustment_pct: Optional[float] = 0
    adjustment_absolute: Optional[float] = 0

class SimulationRequest(BaseModel):
    scenarioId: Optional[str] = None
    customLevers: Optional[List[Adjustment]] = []


class BusinessProfile(BaseModel):
    business_kind: str
    revenue_model: str
    top_cost_categories: List[str]
    seasonal_patterns: str
    carries_inventory: str
    existing_debt: str
    accounting_software: str
    primary_goal: str


class CompanyCreateRequest(BaseModel):
    name: str
    business_type: Optional[str] = None

# Global State
class GlobalState:
    def __init__(self):
        self.reset()
    
    def reset(self):
        self.last_report = None
        # Core transaction store backing the review screen
        self.transactions = pd.DataFrame(
            columns=[
                'id',
                'transaction_date',
                'description',
                'amount',
                'predicted_category',
                'gaap_activity',
                'confidence',
                'status',
                'merchant',
            ]
        )
        self.blueprint = "General"
        self.custom_drivers = []
        self.next_txn_id = 1

state = GlobalState()

@app.post("/api/v1/reset")
async def reset_state():
    state.reset()
    return {"status": "cleared"}


@app.post("/api/v1/upload/csv")
async def upload_csv(file: UploadFile = File(...)):
    """
    Endpoint used by the React upload component.
    Parses CSV, classifies, persists transactions, and updates in-memory state.
    """
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        df.columns = df.columns.astype(str).str.strip().str.lower()

        # Reuse analyze normalization
        rename_map = {
            'date': 'transaction_date',
            'transaction date': 'transaction_date',
            'desc': 'description',
            'activity': 'description',
            'memo': 'description',
            'details': 'description',
            'cost': 'amount',
            'value': 'amount',
            'debit': 'amount',
            'credit': 'amount',
        }
        df = df.rename(columns=rename_map)

        if 'amount' not in df.columns or 'description' not in df.columns:
            return JSONResponse(
                {"message": f"CSV must include 'amount' and 'description'. Found: {list(df.columns)}"},
                status_code=400,
            )

        # If a date column isn't present, still allow upload; UI can sort by id.
        if 'transaction_date' not in df.columns:
            df['transaction_date'] = ""

        upload_id = app_db.create_upload(DEFAULT_COMPANY_ID, file.filename, file.content_type)
        classified = engine.classify(df)
        classified = _attach_ids_and_review_metadata(classified)

        # Persist
        app_db.insert_transactions(DEFAULT_COMPANY_ID, upload_id, classified.to_dict(orient="records"))

        # Update in-memory state for dashboard/scenarios
        state.transactions = classified
        state.blueprint = engine.identify_blueprint(state.transactions)
        state.last_report = engine.generate_navigator_report(state.transactions)

        return {"total": int(len(classified)), "classified": int(len(classified)), "errors": 0}
    except Exception as e:
        logger.error(f"Upload CSV failed: {e}")
        return JSONResponse({"message": str(e)}, status_code=500)


@app.post("/api/v1/upload/json")
async def upload_json(file: UploadFile = File(...)):
    """
    Accepts a JSON array of transactions and processes it similarly to CSV upload.
    Expected fields per item: date/transaction_date, description, amount.
    """
    try:
        raw = await file.read()
        data = json.loads(raw.decode("utf-8"))
        if not isinstance(data, list):
            return JSONResponse({"message": "JSON must be an array of transactions"}, status_code=400)

        df = pd.DataFrame(data)
        df.columns = df.columns.astype(str).str.strip().str.lower()
        df = df.rename(
            columns={
                'date': 'transaction_date',
                'transaction date': 'transaction_date',
            }
        )
        if 'amount' not in df.columns or 'description' not in df.columns:
            return JSONResponse(
                {"message": f"JSON must include 'amount' and 'description'. Found: {list(df.columns)}"},
                status_code=400,
            )
        if 'transaction_date' not in df.columns:
            df['transaction_date'] = ""

        upload_id = app_db.create_upload(DEFAULT_COMPANY_ID, file.filename, file.content_type)
        classified = engine.classify(df)
        classified = _attach_ids_and_review_metadata(classified)
        app_db.insert_transactions(DEFAULT_COMPANY_ID, upload_id, classified.to_dict(orient="records"))

        state.transactions = classified
        state.blueprint = engine.identify_blueprint(state.transactions)
        state.last_report = engine.generate_navigator_report(state.transactions)

        return {"total": int(len(classified)), "classified": int(len(classified)), "errors": 0}
    except Exception as e:
        logger.error(f"Upload JSON failed: {e}")
        return JSONResponse({"message": str(e)}, status_code=500)

@app.post("/api/v1/transactions/add")
async def add_transaction(item: TransactionItem):
    try:
        new_row = pd.DataFrame(
            [
                {
                    'transaction_date': item.date,
                    'description': item.description,
                    'amount': item.amount,
                }
            ]
        )
        
        # Classification
        classified = engine.classify(new_row)
        
        # Attach internal transaction id and review metadata
        classified = _attach_ids_and_review_metadata(classified)
        
        # Merge safely
        if state.transactions.empty:
            state.transactions = classified
        else:
            state.transactions = pd.concat([state.transactions, classified], ignore_index=True)
            
        # Update Report & Blueprint
        state.blueprint = engine.identify_blueprint(state.transactions)
        report = engine.generate_navigator_report(state.transactions)
        state.last_report = report
        
        return report
    except Exception as e:
        logger.error(f"Add transaction failed: {e}")
        return {"error": str(e)}


def _attach_ids_and_review_metadata(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ensures each classified row has a stable `id` and review-related fields.
    This powers the transaction review table on the frontend.
    """
    global state
    if 'id' not in df.columns:
        count = len(df)
        df['id'] = list(range(state.next_txn_id, state.next_txn_id + count))
        state.next_txn_id += count
    
    # Default review metadata if not present
    if 'status' not in df.columns:
        df['status'] = 'pending'
    if 'merchant' not in df.columns:
        df['merchant'] = 'Unknown'
    if 'confidence' not in df.columns:
        # Fallback if upstream model did not attach confidence
        df['confidence'] = 0.75
    
    return df


@app.get("/api/v1/transactions")
async def list_transactions(
    request: Request,
    page: int = 1,
    pageSize: int = 10,
    search: Optional[str] = None,
):
    """
    Paginated transaction feed backing the review screen.
    """
    txns, total = app_db.list_transactions(DEFAULT_COMPANY_ID, page=page, page_size=pageSize, search=search)
    return {"transactions": txns, "pagination": {"page": page, "pageSize": pageSize, "total": int(total)}}


@app.patch("/api/v1/transactions/{txn_id}")
async def update_transaction(txn_id: int, body: dict):
    """
    Allows the UI to approve or later reclassify a transaction.
    For now we support:
      body.classification.approved -> sets status to 'approved'.
    """
    classification = body.get("classification") or {}
    if classification.get("approved"):
        app_db.approve_transaction(DEFAULT_COMPANY_ID, txn_id)
        return {"status": "ok", "transaction_id": txn_id}

    # Correction payload (Phase 0 requirement)
    correction = body.get("correction") or {}
    new_predicted_category = correction.get("predicted_category")
    new_gaap_activity = correction.get("gaap_activity")
    note = correction.get("note")
    if new_predicted_category or new_gaap_activity:
        try:
            app_db.correct_transaction(
                DEFAULT_COMPANY_ID,
                txn_id,
                new_predicted_category=new_predicted_category,
                new_gaap_activity=new_gaap_activity,
                note=note,
            )
            return {"status": "ok", "transaction_id": txn_id, "corrected": True}
        except KeyError:
            return JSONResponse({"error": f"Transaction {txn_id} not found"}, status_code=404)

    return JSONResponse({"error": "No supported update operation provided"}, status_code=400)


@app.get("/api/v1/business-profile")
async def get_business_profile():
    prof = app_db.get_business_profile(DEFAULT_COMPANY_ID)
    if prof is None:
        return {"profile": None}
    try:
        return {"profile": json.loads(prof["payload_json"])}
    except Exception:
        return {"profile": None}


@app.post("/api/v1/business-profile")
async def upsert_business_profile(profile: BusinessProfile):
    payload_json = profile.model_dump_json()
    app_db.upsert_business_profile(DEFAULT_COMPANY_ID, payload_json)
    return {"status": "ok", "profile": profile.model_dump()}


@app.get("/api/v1/companies")
async def list_companies():
    companies = app_db.list_companies()
    cards = []
    for c in companies:
        metrics = app_db.get_company_quick_metrics(c["id"])
        last_updated = app_db.get_company_last_updated(c["id"])

        # Traffic light heuristic for Phase 2
        # - red if negative operating margin or a lot of pending review
        # - amber if margin is weak or some pending review
        # - green otherwise
        health = "green"
        if metrics["operating_margin"] < 0 or metrics["pending_review"] >= 50:
            health = "red"
        elif metrics["operating_margin"] < 0.15 or metrics["pending_review"] >= 10:
            health = "amber"

        # Key metric by archetype (default: operating margin)
        key_metric = {
            "label": "Operating margin",
            "value": round(metrics["operating_margin"] * 100, 1),
            "unit": "%",
        }

        cards.append(
            {
                "id": c["id"],
                "name": c["name"],
                "business_type": c["business_type"],
                "health": health,
                "key_metric": key_metric,
                "goal_progress": 0.0,
                "pending_review": metrics["pending_review"],
                "last_updated": last_updated,
            }
        )

    return {"companies": cards}


@app.post("/api/v1/companies")
async def create_company(req: CompanyCreateRequest):
    c = app_db.create_company(req.name, business_type=req.business_type)
    return {"company": c}


@app.get("/api/v1/alerts")
async def list_alerts():
    """
    Advisor-facing alerts for the currently selected company (default for now).
    In Phase 2 we will aggregate these across companies.
    """
    return {"alerts": app_db.list_alerts(DEFAULT_COMPANY_ID)}


@app.get("/api/v1/formula/templates")
async def get_formula_templates():
    # For now: only Garage is implemented as the first archetype per build sequence.
    return {
        "templates": [
            {"id": "garage", "name": "Auto Repair / Garage", "node_count": len(GARAGE_GRAPH.nodes)}
        ]
    }


@app.get("/api/v1/formula/graph")
async def get_formula_graph(template_id: str = "garage"):
    if template_id != "garage":
        return JSONResponse({"error": "Unknown template"}, status_code=400)

    nodes = []
    # Ensure edges are up to date for UI
    GARAGE_GRAPH.rebuild_edges()
    for key, n in GARAGE_GRAPH.nodes.items():
        nodes.append(
            {
                "key": n.key,
                "name": n.name,
                "formula": n.formula,
                "benchmark": n.benchmark,
                "current_value": n.current_value,
                "projected_value": n.projected_value,
                "unit": n.unit,
                "dependencies": sorted(list(n.dependencies)),
                "dependents": sorted(list(n.dependents)),
            }
        )
    return {"template_id": template_id, "nodes": nodes}


@app.post("/api/v1/formula/evaluate")
async def evaluate_formula_graph(body: dict):
    template_id = body.get("template_id") or "garage"
    mode = body.get("mode") or "projected"
    inputs = body.get("inputs") or {}
    if template_id != "garage":
        return JSONResponse({"error": "Unknown template"}, status_code=400)

    values = GARAGE_GRAPH.evaluate(inputs=inputs, mode=mode)
    return {"template_id": template_id, "mode": mode, "values": values}

class CustomDriverRequest(BaseModel):
    name: str
    unit: str # 'USD' or 'PERCENT'
    category: Optional[str] = "Custom"

@app.post("/api/v1/drivers/add")
async def add_custom_driver(req: CustomDriverRequest):
    new_id = f"driver_custom_{len(state.custom_drivers) + 1}"
    driver_obj = {
        "id": new_id,
        "name": req.name,
        "unit": req.unit,
        "category": req.category,
        "val": 0
    }
    state.custom_drivers.append(driver_obj)
    return {"status": "added", "driver": driver_obj}

@app.get("/api/v1/drivers")
async def get_drivers():
    # Base drivers always available
    drivers = [
        {"id": "driver_gross_margin", "name": "Gross Margin Target", "unit": "%", "category": "Profitability"},
        {"id": "driver_starting_cash", "name": "Cash Injection", "unit": "USD", "category": "Capital"}
    ]
    
    # Blueprint-specific Drivers
    if state.blueprint == 'recurring_retention': # SaaS
        drivers.extend([
            {"id": "driver_cac_01", "name": "Acquisition Cost (CAC)", "unit": "%", "category": "Growth Efficienty"},
            {"id": "driver_burn_mult_01", "name": "Burn Multiple", "unit": "%", "category": "Efficiency"},
            {"id": "driver_cloud_cost", "name": "Cloud Infra Cost", "unit": "%", "category": "COGS"}
        ])
    elif state.blueprint == 'throughput_efficiency': # Garage/Mfg
        drivers.extend([
            {"id": "driver_material_cost", "name": "Material Markup", "unit": "%", "category": "COGS"},
            {"id": "driver_labor_efficiency", "name": "Labor Efficiency", "unit": "%", "category": "Ops"},
            {"id": "driver_inventory_turn", "name": "Inventory Turn", "unit": "Days", "category": "Working Capital"}
        ])
    else: # General
        drivers.extend([
            {"id": "driver_opex_growth", "name": "OpEx Inflation", "unit": "%", "category": "Expenses"},
            {"id": "driver_rev_growth", "name": "Revenue Growth", "unit": "%", "category": "Growth"}
        ])
        
    return {"drivers": drivers + state.custom_drivers, "blueprint": state.blueprint}

@app.post("/api/v1/scenarios/simulate")
async def simulate_scenario(req: SimulationRequest):
    # Baseline Metrics from Real Data
    # Baseline Metrics from Real Data
    if not state.transactions.empty:
        # Recalculate baseline directly from transactions for accuracy
        ops = state.transactions[state.transactions['gaap_activity'] == 'Operating Activity']
        
        rev = ops[ops['amount'] > 0]['amount'].sum()
        baseline_revenue = float(rev) if rev > 0 else 20000.0
        
        exp = abs(ops[ops['amount'] < 0]['amount'].sum())
        baseline_opex_total = float(exp) if exp > 0 else 10000.0
        
        # Estimate Margin if not explicit
        # Assume 30% margin for Safety if unknown
        baseline_margin = 0.30
        
        # Split Expense into COGS and OpEx based on Margin
        # COGS = Rev * (1 - Margin)
        # OpEx = Total_Exp - COGS
        
        # However, if Total_Exp > Rev, margin is negative.
        # Let's derive "Realized Margin" first
        if baseline_revenue > 0:
            realized_margin = (baseline_revenue - baseline_opex_total) / baseline_revenue
            #If realized margin is terrible (negative), use it.
            baseline_margin = realized_margin
            
        baseline_cogs = baseline_revenue * (1 - baseline_margin) # This might be improper if margin is negative, but math holds.
        # Ideally: 
        # COGS should be variable. OpEx fixed.
        # For simplicity in this demo:
        baseline_cogs = 0 # simplifying assumption that 'operating expense' is just Burn
        baseline_opex = baseline_opex_total

        baseline_cash = 100000.0
    else:
        baseline_revenue = 20000.0
        baseline_margin = 0.30
        baseline_cogs = baseline_revenue * (1 - baseline_margin)
        baseline_opex = 9000.0
        baseline_cash = 100000.0

    # Initialize Factors
    factors = {
        'rev_growth': 1.05,
        'opex_growth': 1.02,
        'margin_adj': 0.0,
        'cash_adj': 0.0,
        'cogs_inflation': 0.0
    }

    # Process Levers
    for adj in req.customLevers:
        # Growth
        if adj.driver_id == 'driver_cac_01': factors['rev_growth'] *= (1 - adj.adjustment_pct)
        if adj.driver_id == 'driver_rev_growth': factors['rev_growth'] += adj.adjustment_pct
        
        # Cost / Margin
        if adj.driver_id == 'driver_burn_mult_01': factors['opex_growth'] *= (1 + adj.adjustment_pct)
        if adj.driver_id == 'driver_gross_margin': factors['margin_adj'] += adj.adjustment_pct
        if adj.driver_id == 'driver_material_cost': factors['cogs_inflation'] += adj.adjustment_pct
        
        # Cash
        if adj.driver_id == 'driver_starting_cash': factors['cash_adj'] += adj.adjustment_absolute
        if adj.driver_id == 'driver_headcount_eng': 
            baseline_opex += (adj.adjustment_absolute * 8000)
            
        # Handle Dynamic Custom Levers based on category
        if 'driver_custom' in adj.driver_id:
             # Basic logic map for custom vars
             # If "Revenue" in ID (unlikely) or we need to look up the driver definition
             # For now, simplistic approach:
             pass 

    # Simulation Loop
    forecast = []
    current_cash = baseline_cash + factors['cash_adj']
    current_rev = baseline_revenue
    current_opex = baseline_opex
    current_margin = baseline_margin + factors['margin_adj']
    
    months = list(range(1, 13))
    for m in months:
        current_rev *= factors['rev_growth']
        current_opex *= factors['opex_growth']
        
        # Recalculate COGS based on Margin OR Inflation
        # If specific COGS inflation is set, use that, otherwise trust the Margin target
        if factors['cogs_inflation'] != 0:
            # Derived COGS logic
            base_cogs = current_rev * (1 - baseline_margin)
            current_cogs = base_cogs * (1 + factors['cogs_inflation'])
            # Update margin for reference
            current_margin = (current_rev - current_cogs) / current_rev
        else:
            current_cogs = current_rev * (1 - current_margin)

        net_flow = current_rev - current_cogs - current_opex
        current_cash += net_flow
        
        forecast.append({
            "month": m,
            "cash_balance": max(0, current_cash),
            "revenue": current_rev,
            "burn": current_cogs + current_opex,
            "net_flow": net_flow,
            "margin": current_margin
        })

    # AI Insights
    insight_text = []
    if not state.transactions.empty:
        # We pass the FINAL month's projected state to the engine to get "Future Insights"
        # Construct a synthetic row for the engine
        last_month = forecast[-1]
        
        # Use existing engine logic but maybe we need a 'predict_milestone' method
        # For now, we reuse the existing method with current data
        # Ideally, we'd pass the projected dataframe
        insight_text = engine.generate_milestone_insight(state.transactions, state.blueprint)

    return {
        "forecast": forecast,
        "insights": insight_text,
        "blueprint_used": state.blueprint
    }

@app.get("/api/v1/stats")
async def get_stats():
    # Provide summary metrics for the Dashboard
    if state.transactions.empty:
        return {
            "amounts": {"total": 0, "net": 0},
            "categories": {"operating": 0, "investing": 0, "financing": 0},
            "recentActivity": [],
            "identity": {"blueprint": "Unknown"}
        }
    
    # Calculate Totals
    # Robust Revenue: Only count positive amounts in Operating Activity
    operating_inflows = state.transactions[
        (state.transactions['gaap_activity'] == 'Operating Activity') & 
        (state.transactions['amount'] > 0)
    ]['amount'].sum()
    
    # Robust Expenses: Only count negative amounts in Operating Activity
    operating_outflows = state.transactions[
        (state.transactions['gaap_activity'] == 'Operating Activity') & 
        (state.transactions['amount'] < 0)
    ]['amount'].sum() # This is negative

    # Use operating revenue as Core Revenue, fallback to total positive if 0 (e.g. if classification missed)
    total_revenue = operating_inflows if operating_inflows > 0 else state.transactions[state.transactions['amount'] > 0]['amount'].sum()
    
    # Gross Margin Proxy: (Revenue - |OpEx|) / Revenue
    # In reality we need COGS vs OpEx. For now, we assume 70% of Ops Outflow is COGS/OpEx mix.
    opex_mag = abs(operating_outflows)
    net_operating_profit = total_revenue - opex_mag
    
    gross_margin_trace = 0.0
    if total_revenue > 0:
        gross_margin_trace = (net_operating_profit / total_revenue) * 100

    net_profit = state.transactions['amount'].sum()
    
    # Calculate Categories
    cats = state.transactions.groupby('gaap_activity')['amount'].sum().to_dict()
    
    # Format Recent Activity (Last 50)
    recent = state.transactions.tail(50).to_dict(orient='records')
    
    return {
        "amounts": {
            "total": float(total_revenue), 
            "net": float(net_profit),
            "margin": float(gross_margin_trace),
            "burn": float(opex_mag)
        },
        "categories": {
            "operating": float(cats.get('Operating Activity', 0)),
            "investing": float(cats.get('Investing Activity', 0)),
            "financing": float(cats.get('Financing Activity', 0))
        },
        "recentActivity": recent,
        "identity": {"blueprint": state.blueprint}
    }

@app.post("/api/v1/analyze")
async def analyze_transactions(
    file: UploadFile = File(None),
    text_data: str = Form(None)
):
    try:
        if file:
            content = await file.read()
            df = pd.read_csv(io.BytesIO(content))
        elif text_data:
            df = pd.read_csv(io.StringIO(text_data))
        else:
            return {"error": "No data provided"}

        # Normalize Columns (strip spaces, lowercase)
        df.columns = df.columns.astype(str).str.strip().str.lower()
        
        # Column Resilient Mapping
        rename_map = {
            'date': 'transaction_date',
            'desc': 'description',
            'activity': 'description',
            'memo': 'description',
            'cost': 'amount',
            'value': 'amount'
        }
        df = df.rename(columns=rename_map)

        # Validate
        if 'amount' not in df.columns or 'description' not in df.columns:
            return {"error": f"CSV must have 'amount' and 'description' columns. Found: {list(df.columns)}"}

        # Run through the engine
        classified = engine.classify(df)
        classified = _attach_ids_and_review_metadata(classified)
        
        # Persist to database so ML Review UI can pull it
        upload_name = file.filename if file else "manual_upload.csv"
        mime_type = file.content_type if file else "text/csv"
        upload_id = app_db.create_upload(DEFAULT_COMPANY_ID, upload_name, mime_type)
        app_db.insert_transactions(DEFAULT_COMPANY_ID, upload_id, classified.to_dict(orient="records"))
        
        report = engine.generate_navigator_report(classified)
        state.last_report = report
        state.transactions = classified
        
        return report

    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        return {"error": str(e)}

# Serve the Premium Dark-Mode UI (web/index.html) as the root
@app.get("/", response_class=HTMLResponse)
async def serve_navigator_ui():
    index_path = os.path.join(config.BASE_DIR, "web", "index.html")
    with open(index_path, "r") as f:
        return f.read()

# Serve static files for the web dashboard if needed
app.mount("/web", StaticFiles(directory=os.path.join(config.BASE_DIR, "web")), name="web_static")

# Serve React build at /csfaudit if it exists
dist_path = os.path.join(config.BASE_DIR, "frontend", "dist")
if os.path.exists(dist_path):
    app.mount("/csfaudit", StaticFiles(directory=dist_path, html=True), name="csfaudit")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
