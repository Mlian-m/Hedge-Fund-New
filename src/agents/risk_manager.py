import math

from langchain_core.messages import HumanMessage

from agents.state import AgentState, show_agent_reasoning

import json
import ast


##### Risk Management Agent #####
def risk_management_agent(state: AgentState):
    """Evaluates portfolio risk and sets position limits based on comprehensive risk analysis.

    Calculates volatility, position size limits, stop loss, and take profit levels
    based on portfolio state and market conditions.

    Args:
        state (AgentState): Current agent state containing:
            - data: Dict with portfolio info and price data
            - metadata: Dict with show_reasoning flag

    Returns:
        dict: Updated state with risk management message containing:
            - max_position_margin: Maximum position size accounting for margin
            - risk_metrics: Dict with volatility, stop loss, and take profit levels
            - reasoning: Explanation of risk calculations
    """
    show_reasoning = state["metadata"]["show_reasoning"]
    portfolio = state["data"]["portfolio"]
    cash = portfolio["cash"]
    data = state["data"]
    max_loss = portfolio["risk"]
    leverage = portfolio["leverage"]
    prices_df = data["prices"]

    # 1. Calculate volatility
    prices_df["returns"] = prices_df["close"].pct_change()
    prices_df.dropna(inplace=True)
    prices_df["volatility_24"] = prices_df["returns"].rolling(window=24).std()
    volatility = prices_df["volatility_24"].mean()

    # 2. Position Size Limits
    max_loss_cash = cash * max_loss
    max_position_size = max_loss_cash / volatility
    if max_position_size > cash:
        max_position_size = cash
    max_position_margin = max_position_size / leverage

    # 3. Stop loss, Price Stop Loss
    stop_loss = "{:.2%}".format(volatility * leverage)
    take_profit = stop_loss
    volatility_f = "{:.2%}".format(volatility)
    message_content = {
        "max_position_margin": float(max_position_margin),
        "risk_metrics": {
            "volatility": volatility_f,
            "stop loss": stop_loss,
            "take profit": take_profit,
        },
        "reasoning": f"Volatility={volatility:.2%},  "
        f"Max Loss as a percentage of the fund={max_loss:.2%} , "
        f"Max Loss as cash of the fund={max_loss_cash:.2%}",
    }

    # Create the risk management message
    message = HumanMessage(
        content=json.dumps(message_content),
        name="risk_management_agent",
    )

    if show_reasoning:
        show_agent_reasoning(message_content, "Risk Management Agent")

    return {"messages": state["messages"] + [message]}
