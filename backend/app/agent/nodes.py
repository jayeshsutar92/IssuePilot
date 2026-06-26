from google.adk.agents import LlmAgent
from google.adk.workflow import JoinNode
from app.agent.schemas import DuplicateCheckResult, MissingInfoResult, LabelPriorityResult, IssueTriageResult, PriorityEnum
from app.agent.tools import github_search_issues
import logging

logger = logging.getLogger(__name__)

# 1. Initialize State Node
def initialize_state(ctx, node_input) -> str:
    """Saves incoming issue details to state for templating and tools access."""
    import json
    if hasattr(node_input, "parts") and node_input.parts:
        try:
            data = json.loads(node_input.parts[0].text)
        except Exception:
            data = {}
    elif isinstance(node_input, dict):
        data = node_input
    else:
        try:
            data = json.loads(str(node_input))
        except Exception:
            data = {}

    ctx.state["issue_number"] = data.get("issue_number", 0)
    ctx.state["title"] = data.get("title", "")
    ctx.state["body"] = data.get("body") or ""
    ctx.state["owner"] = data.get("owner", "")
    ctx.state["repo"] = data.get("repo", "")
    
    logger.info(f"Initialized state for Issue #{ctx.state['issue_number']}: {ctx.state['title']}")

    return (
        f"Issue #{ctx.state['issue_number']}\n"
        f"Title: {ctx.state['title']}\n"
        f"Description:\n{ctx.state['body']}"
    )

# 2. Duplicate Detector Agent
duplicate_detector = LlmAgent(
    name="duplicate_detector",
    model="gemini-2.5-flash",
    instruction=(
        "You are a Duplicate Detector Agent. Analyze the issue details in the input and determine if this issue is a duplicate "
        "of another issue already present in the repository.\n"
        "The repository is '{owner}/{repo}'.\n"
        "Use the github_search_issues tool to find issues similar to the current issue. "
        "Search using keywords from the issue title and body. Compare the new issue description with the search results "
        "and determine if it duplicates an existing one (whether open or closed). "
        "Provide a clear duplicate check assessment and name the duplicate issue number if applicable."
    ),
    tools=[github_search_issues],
    output_schema=DuplicateCheckResult,
    output_key="dup_result"
)

# 3. Missing Info Checker Agent
missing_info_checker = LlmAgent(
    name="missing_info_checker",
    model="gemini-2.5-flash",
    instruction=(
        "You are a Missing Information Checker Agent. Analyze the issue details in the input and verify if there is crucial "
        "information missing for triage or debugging (such as steps to reproduce, environment info, or logs).\n"
        "Identify exactly what critical details are missing to help the developer fix the issue."
    ),
    output_schema=MissingInfoResult,
    output_key="info_result"
)

# 4. Label & Priority Predictor Agent
label_priority_predictor = LlmAgent(
    name="label_priority_predictor",
    model="gemini-2.5-flash",
    instruction=(
        "You are a Label and Priority Predictor Agent. Analyze the issue details and recommend relevant labels (like 'bug', "
        "'feature', 'refactor', 'documentation') and assign a triage priority (LOW, MEDIUM, HIGH, CRITICAL) "
        "based on severity and impact.\n"
        "- CRITICAL: Crashes, blocker bugs, severe regressions.\n"
        "- HIGH: Core feature broken with no workaround.\n"
        "- MEDIUM: Bugs in secondary features, or bugs with clear workarounds.\n"
        "- LOW: Minor UI bugs, typos, refactoring, documentation."
    ),
    output_schema=LabelPriorityResult,
    output_key="label_result"
)

# 5. Join Node
merge_analysis = JoinNode(name="merge_analysis")

# 6. Format Triage Summary Node
def format_triage_summary(ctx, node_input: dict) -> IssueTriageResult:
    """Combines outputs from the parallel agents into a structured IssueTriageResult."""
    logger.info("Formatting triage summary...")
    # JoinNode output format is dict keyed by predecessor names
    dup_data = node_input.get("duplicate_detector") or {}
    info_data = node_input.get("missing_info_checker") or {}
    label_data = node_input.get("label_priority_predictor") or {}

    is_duplicate = dup_data.get("is_duplicate", False)
    duplicate_number = dup_data.get("duplicate_issue_number")
    
    is_missing_info = info_data.get("is_missing_info", False)
    missing_fields = info_data.get("missing_fields", [])
    
    suggested_labels = label_data.get("suggested_labels", [])
    priority_str = label_data.get("priority", "LOW")
    try:
        priority = PriorityEnum(priority_str)
    except Exception:
        priority = PriorityEnum.LOW
    
    # Construct combined rationale
    combined_rationale = (
        f"### Duplicate Status\n- Duplicate? {is_duplicate}\n"
        f"- Duplicate Issue: #{duplicate_number if duplicate_number else 'N/A'}\n"
        f"- Rationale: {dup_data.get('rationale', 'N/A')}\n\n"
        
        f"### Missing Information\n- Missing Info? {is_missing_info}\n"
        f"- Missing Fields: {', '.join(missing_fields) if missing_fields else 'None'}\n"
        f"- Rationale: {info_data.get('rationale', 'N/A')}\n\n"
        
        f"### Priority & Labels\n- Recommended Priority: {priority.value}\n"
        f"- Suggested Labels: {', '.join(suggested_labels) if suggested_labels else 'None'}\n"
        f"- Rationale: {label_data.get('rationale', 'N/A')}"
    )
    
    suggested_maintainer_response = label_data.get("suggested_response")
    logger.info(f"Triage completed for Issue #{ctx.state.get('issue_number')}. Priority: {priority.value}, Duplicate: {is_duplicate}")
    
    return IssueTriageResult(
        issue_number=ctx.state.get("issue_number", 0),
        title=ctx.state.get("title", ""),
        priority=priority,
        is_duplicate=is_duplicate,
        duplicate_issue_number=duplicate_number,
        missing_information=missing_fields if is_missing_info else [],
        suggested_labels=suggested_labels,
        rationale=combined_rationale,
        suggested_maintainer_response=suggested_maintainer_response
    )
