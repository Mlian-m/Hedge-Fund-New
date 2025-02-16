from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai.chat_models import ChatOpenAI
from config.analysis_weights import (
    TECHNICAL_ANALYSIS_WEIGHT,
    SENTIMENT_ANALYSIS_WEIGHT,
)

from agents.state import AgentState, show_agent_reasoning
import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), "../../.env")

load_dotenv(dotenv_path)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


##### Portfolio Management Agent #####
def portfolio_management_agent(state: AgentState):
    """Makes final trading decisions and generates orders"""
    show_reasoning = state["metadata"]["show_reasoning"]
    portfolio = state["data"]["portfolio"]

    # Get the technical analyst, fundamentals agent, and risk management agent messages
    technical_message = next(
        msg for msg in state["messages"] if msg.name == "technical_analyst_agent"
    )
    sentiment_message = next(
        msg for msg in state["messages"] if msg.name == "sentiment_agent"
    )
    risk_message = next(
        msg for msg in state["messages"] if msg.name == "risk_management_agent"
    )

    # Log the input signals
    print("\nPortfolio Manager Input Signals:")
    print("Technical Analysis:", technical_message.content)
    print("Sentiment Analysis:", sentiment_message.content)
    print("Risk Management:", risk_message.content)

    # Create the prompt template
    template = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                """You are a portfolio manager making final trading decisions.
                Your job is to make a trading decision based on the team's analysis while strictly adhering
                to risk management constraints.

                RISK MANAGEMENT CONSTRAINTS:
                - You MUST NOT exceed the max_position_size specified by the risk manager
                - You MUST follow the stop loss, price to set stop loss recommended by risk management
                - These are hard constraints that cannot be overridden by other signals

                When weighing the different signals for direction and timing:

                1. Technical Analysis (25% weight)
                   - Secondary confirmation
                   - Helps with entry/exit timing
                
                2. Sentiment Analysis (10% weight)
                   - Final consideration
                   - Can influence sizing within risk limits
                
                The decision process should be:
                1. First check risk management constraints
                2. Use technical analysis for timing
                3. Consider sentiment for final adjustment

                You must return a JSON object with the following structure:
                {{
                    "portfolio": {{
                        "cash": "500000.00",
                        "leverage": "20.00",
                        "risk": "0.01"
                    }},
                    "decision": {{
                        "action": "long or short",
                        "quantity": 25000,
                        "volatility": "0.56%",
                        "stop_loss": "11.26%",
                        "take_profit": "11.26%",
                        "confidence": "56.5%"
                    }},
                    "agent_signals": [
                        {{
                            "agent": "Technical Analysis",
                            "signal": "neutral",
                            "confidence": "50%"
                        }}
                    ],
                    "reasoning": "• Point 1\\n• Point 2\\n• Point 3"
                }}

                Trading Rules:
                - Never exceed risk management position limits
                - Quantity must be ≤ current position for sells
                - Quantity must be ≤ max_position_margin from risk management""",
            ),
            (
                "human",
                """Based on the team's analysis below, make your trading decision.

                Technical Analysis Trading Signal: {technical_message}
                Sentiment Analysis Trading Signal: {sentiment_message}
                Risk Management : {risk_message}

                Current portfolio:
                Cash: {portfolio_cash}
                Leverage: {portfolio_leverage}
                Risk: {portfolio_risk}
                
                Remember to include:
                - Stop Loss and Take profit values based on cryptocurrency volatility and leverage
                - Quantity value based on risk
                
                Return your decision in the exact JSON format specified, ensuring all fields are present.
                For the reasoning field, use bullet points separated by newlines (\\n).
                The action must be either "long" or "short".
                All numeric values should be formatted as strings with appropriate units (% for percentages).
                """,
            ),
        ]
    )

    # Generate the prompt
    prompt = template.invoke(
        {
            "technical_message": technical_message.content,
            "sentiment_message": sentiment_message.content,
            "risk_message": risk_message.content,
            "portfolio_cash": f"{portfolio['cash']:.2f}",
            "portfolio_leverage": f"{portfolio['leverage']:.2f}",
            "portfolio_risk": f"{portfolio['risk']:.2f}",
        }
    )
    
    # Invoke the LLM
    llm = ChatOpenAI(
        openai_api_key=OPENAI_API_KEY, temperature=0.3, model="gpt-4o-mini"
    )
    result = llm.invoke(prompt)

    # Clean up the content to remove any markdown formatting
    content = result.content.strip()
    if content.startswith("```json"):
        content = content[7:]  # Remove ```json prefix
    if content.endswith("```"):
        content = content[:-3]  # Remove ``` suffix
    content = content.strip()  # Remove any extra whitespace

    # Create the portfolio management message
    message = HumanMessage(
        content=content,
        name="portfolio_management",
    )

    # Print the decision if the flag is set
    if show_reasoning:
        show_agent_reasoning(message.content, "Portfolio Management Agent")

    return {"messages": state["messages"] + [message]}
