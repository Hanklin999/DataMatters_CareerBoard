from pathlib import Path
import json

root = Path(__file__).resolve().parent
required = [
    root / "README.md",
    root / "RESULTS.md",
    root / "METRIC_DEFINITIONS.md",
    root / "sql" / "00_build_analytics_mart.sql",
    root / "sql" / "01_data_quality.sql",
    root / "sql" / "02_funnel.sql",
    root / "sql" / "03_question_friction.sql",
    root / "sql" / "04_recommendation_quality.sql",
    root / "sql" / "05_product_decision.sql",
    root / "sql" / "99_export_for_notebook.sql",
    root / "notebooks" / "product_ds_analysis.ipynb",
]

missing = [str(path.relative_to(root)) for path in required if not path.exists()]
if missing:
    raise SystemExit(f"Missing analysis files: {missing}")

notebook = json.loads((root / "notebooks" / "product_ds_analysis.ipynb").read_text(encoding="utf-8"))
if notebook.get("nbformat") != 4:
    raise SystemExit("Notebook must use nbformat 4.")

mart = (root / "sql" / "00_build_analytics_mart.sql").read_text(encoding="utf-8")
for view in ["stg_events", "fct_question_responses", "fct_sessions", "fct_recommendation_outcomes"]:
    if view not in mart:
        raise SystemExit(f"Missing expected analytics view: {view}")

print("Product DS analysis package structure is valid.")
