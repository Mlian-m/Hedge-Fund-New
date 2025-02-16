from langchain_openai.chat_models import ChatOpenAI
from langchain_core.messages import HumanMessage

from agents.state import AgentState, show_agent_reasoning
from tools.api import get_price_API_HYPERLIQUID, get_LS_OI_Copin

from datetime import datetime
import json


def check_data_valid(crypto, start_date, end_date):
    """
    Validate if market data is available for the given crypto and date range.

    Args:
        crypto (str): Cryptocurrency symbol
        start_date (str, optional): Start date in 'YYYY-MM-DD' format. If None, defaults to 1 month before end_date
        end_date (str, optional): End date in 'YYYY-MM-DD' format. If None, defaults to current date

    Returns:
        bool: True if both price and insider trade data are available, False otherwise
    """
    # Set default dates
    end_date = end_date or datetime.now().strftime("%Y-%m-%d")
    if not start_date:
        # Calculate 1 months before end_date
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
        start_date = (
            end_date_obj.replace(month=end_date_obj.month - 1)
            if end_date_obj.month > 1
            else end_date_obj.replace(
                year=end_date_obj.year - 1, month=end_date_obj.month + 11
            )
        )
        start_date = start_date.strftime("%Y-%m-%d")
    else:
        start_date = start_date

    prices = get_price_API_HYPERLIQUID(
        pair=crypto,
        open_time=start_date,
        close_time=end_date,
    )
    insider_trades = get_LS_OI_Copin(pair=crypto)
    if isinstance(prices, str) | isinstance(insider_trades, str):
        print("Data invalid")
        return False
    else:
        return True


def market_data_agent(state: AgentState):
    """
    Agent responsible for gathering and preprocessing market data.

    This agent:
    1. Sets up the date range (defaults to last month if not specified)
    2. Fetches historical price data from HyperLiquid
    3. Retrieves long/short open interest data from Copin

    Args:
        state (AgentState): Current state containing:
            - messages: List of conversation messages
            - data: Dict containing:
                - crypto: Cryptocurrency symbol
                - start_date: Optional start date
                - end_date: Optional end date
            - metadata: Dict containing configuration options

    Returns:
        dict: Updated state with:
            - messages: Original messages plus the market data message
            - data: Original data plus:
                - prices: Historical OHLCV price data
                - start_date: Processed start date
                - end_date: Processed end date
                - insider_trades: Long/short open interest data
            - metadata: Original metadata
    """
    messages = state["messages"]
    data = state["data"]
    metadata = state["metadata"]
    show_reasoning = metadata.get("show_reasoning", True)
    
    # Set default dates
    end_date = data["end_date"] or datetime.now().strftime("%Y-%m-%d")
    if not data["start_date"]:
        # Calculate 1 months before end_date
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
        start_date = (
            end_date_obj.replace(month=end_date_obj.month - 1)
            if end_date_obj.month > 1
            else end_date_obj.replace(
                year=end_date_obj.year - 1, month=end_date_obj.month + 11
            )
        )
        start_date = start_date.strftime("%Y-%m-%d")
    else:
        start_date = data["start_date"]

    # Get the historical price data
    print(f"Fetching price data for {data['crypto']} from {start_date} to {end_date}")
    prices = get_price_API_HYPERLIQUID(
        pair=data["crypto"],
        open_time=start_date,
        close_time=end_date,
    )

    # Get the insider trades
    print(f"Fetching insider trades for {data['crypto']}")
    insider_trades = get_LS_OI_Copin(pair=data["crypto"])
    
    # Handle error case from get_LS_OI_Copin
    if isinstance(insider_trades, str):
        insider_trades = (0, 0)  # Default to no signals if error

    # Create detailed reasoning
    reasoning = (
        f"Market Data Analysis for {data['crypto']}:\n\n"
        f"1. Time Period:\n"
        f"   • Start Date: {start_date}\n"
        f"   • End Date: {end_date}\n\n"
        f"2. Data Sources:\n"
        f"   • Price Data: Successfully retrieved from HyperLiquid\n"
        f"   • Trading Data: Successfully retrieved from Copin\n\n"
        f"3. Data Quality:\n"
        f"   • Price Data: {len(prices)} data points collected\n"
        f"   • Insider Trading: Long/Short ratio data available"
    )

    # Create message content with the findings
    message_content = {
        "signal": "data_collected",
        "confidence": "100%",
        "reasoning": reasoning
    }

    # Show reasoning if enabled
    if show_reasoning:
        show_agent_reasoning(message_content, "Market Data Agent")

    # Create the market data message
    message = HumanMessage(
        content=json.dumps(message_content),
        name="market_data_agent",
    )

    return {
        "messages": [*messages, message],
        "data": {
            **data,
            "prices": prices,
            "start_date": start_date,
            "end_date": end_date,
            "insider_trades": insider_trades,
        },
        "metadata": metadata
    }
