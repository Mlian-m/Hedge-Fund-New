from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os
from dotenv import load_dotenv
import json
from langchain_core.messages import HumanMessage

# Get the absolute path to the src directory
AI_SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), '../src'))

# Add to Python path if not already there
if AI_SRC not in sys.path:
    sys.path.insert(0, AI_SRC)
    print(f"Added to Python path: {AI_SRC}")

try:
    # Import your existing analysis code
    from agents.market_data import market_data_agent, check_data_valid
    from agents.portfolio_manager import portfolio_management_agent
    from agents.technicals import technical_analyst_agent
    from agents.risk_manager import risk_management_agent
    from agents.sentiment import sentiment_agent
    from agents.social_monitor import social_monitor_agent
    from agents.state import AgentState
    from langgraph.graph import END, StateGraph
    print("Successfully imported required modules")
except ImportError as e:
    print(f"Import error: {e}")
    print(f"Current Python path: {sys.path}")
    raise

app = FastAPI(title="AI Hedge Fund API v2")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",     # Next.js development server
        "http://localhost:3001",     # Alternative Next.js port
        "http://127.0.0.1:3000",     # Alternative local address
        "http://127.0.0.1:3001",     # Alternative local address
        "http://localhost:8000",     # FastAPI server (for Swagger UI)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the workflow
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("market_data_agent", market_data_agent)
workflow.add_node("technical_analyst_agent", technical_analyst_agent)
workflow.add_node("sentiment_agent", sentiment_agent)
workflow.add_node("social_monitor_agent", social_monitor_agent)
workflow.add_node("risk_management_agent", risk_management_agent)
workflow.add_node("portfolio_management_agent", portfolio_management_agent)

# Define the workflow
workflow.set_entry_point("market_data_agent")
workflow.add_edge("market_data_agent", "technical_analyst_agent")
workflow.add_edge("market_data_agent", "sentiment_agent")
workflow.add_edge("market_data_agent", "social_monitor_agent")
workflow.add_edge("technical_analyst_agent", "risk_management_agent")
workflow.add_edge("sentiment_agent", "risk_management_agent")
workflow.add_edge("social_monitor_agent", "risk_management_agent")
workflow.add_edge("risk_management_agent", "portfolio_management_agent")
workflow.add_edge("portfolio_management_agent", END)

# Compile the workflow
compiled_workflow = workflow.compile()

class AnalysisRequest(BaseModel):
    crypto: str
    startDate: str | None = None
    endDate: str | None = None
    balance: float | None = None
    leverage: float | None = None
    risk: float | None = None

@app.post("/api/analyze")
async def analyze(request: AnalysisRequest):
    try:
        print(f"Analyzing crypto: {request.crypto}")
        print(f"Date range: {request.startDate} to {request.endDate}")
        print(f"Portfolio settings: balance={request.balance}, leverage={request.leverage}, risk={request.risk}")
        
        # Default portfolio settings
        portfolio = {
            "cash": request.balance or 500000,  # $500k starting capital
            "leverage": request.leverage or 20,  # 20x leverage
            "risk": request.risk or 0.01,   # 1% risk per trade
        }
        
        # Initialize state
        initial_state = {
            "messages": [
                HumanMessage(
                    content="Make a trading decision based on the provided data.",
                )
            ],
            "data": {
                "crypto": request.crypto,
                "portfolio": portfolio,
                "start_date": request.startDate,  # Will use default (1 month ago) if None
                "end_date": request.endDate,    # Will use default (current date) if None
                "analyst_signals": {},
            },
            "metadata": {
                "show_reasoning": True
            }
        }

        # Check if data is available
        valid = check_data_valid(request.crypto, request.startDate, request.endDate)
        if not valid:
            raise HTTPException(
                status_code=400,
                detail="Unable to fetch required market data for analysis"
            )

        # Run the complete workflow
        final_state = compiled_workflow.invoke(initial_state)
        
        # Extract the final decision
        final_decision = json.loads(final_state["messages"][-1].content)
        print("\nFinal Portfolio Decision:", json.dumps(final_decision, indent=2))
        
        # Define the order we want to display the agents
        agent_order = [
            "market_data_agent",
            "technical_analyst_agent",
            "sentiment_agent",
            "social_monitor_agent",
            "risk_management_agent",
            "portfolio_management_agent"
        ]
        
        # Create a dictionary to store the latest message from each agent
        agent_messages = {}
        
        # Process messages in reverse order to get the latest message from each agent
        for message in reversed(final_state["messages"]):
            if message.name and message.name not in agent_messages:
                try:
                    content = json.loads(message.content)
                    print(f"\n{message.name} output:", json.dumps(content, indent=2))
                    
                    if isinstance(content, dict):
                        # Format technical analysis output specially
                        if message.name == "technical_analyst_agent":
                            strategy_summary = {
                                "signal": content.get("signal", "neutral"),
                                "confidence": content.get("confidence", "0%"),
                                "strategies": {
                                    k: {
                                        "signal": v.get("signal", "neutral"),
                                        "confidence": v.get("confidence", "0%")
                                    } for k, v in content.get("strategy_signals", {}).items()
                                }
                            }
                            agent_messages[message.name] = {
                                "agent": message.name,
                                "reasoning": strategy_summary
                            }
                            print(f"\nProcessed Technical Analysis:", json.dumps(strategy_summary, indent=2))
                        else:
                            agent_messages[message.name] = {
                                "agent": message.name,
                                "reasoning": content.get("reasoning", content)
                            }
                except json.JSONDecodeError as e:
                    print(f"\nError parsing {message.name} output:", str(e))
                    print("Raw content:", message.content)
                    continue
                except Exception as e:
                    print(f"\nUnexpected error processing {message.name}:", str(e))
                    continue
        
        # Create the final agent_reasoning list in the desired order
        agent_reasoning = [
            agent_messages[agent_name]
            for agent_name in agent_order
            if agent_name in agent_messages
        ]

        # Log the final response
        response = {
            "analysis": final_decision,
            "agent_reasoning": agent_reasoning
        }
        print("\nFinal API Response:", json.dumps(response, indent=2))
        
        return response
    except Exception as e:
        error_msg = str(e)
        print(f"Analysis error: {error_msg}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {error_msg}"
        )

if __name__ == "__main__":
    print("\nStarting AI Hedge Fund API server...")
    print(f"Python path: {sys.path}")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info") 