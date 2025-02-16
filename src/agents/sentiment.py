from langchain_core.messages import HumanMessage

from agents.state import AgentState, show_agent_reasoning

import pandas as pd

import numpy as np

import json


##### Sentiment Agent #####
def sentiment_agent(state: AgentState):
    """Analyzes market sentiment and generates trading signals based on insider trading data.

    Args:
        state (AgentState): Current agent state containing:
            - messages: List of previous messages
            - data: Dict with insider_trades (bullish_signals, bearish_signals)
            - metadata: Dict with show_reasoning flag

    Returns:
        dict: Updated state with:
            - messages: List of previous messages plus new sentiment analysis message
            - data: Original data dict with updated analyst_signals
            - metadata: Original metadata dict
    """
    messages = state["messages"]
    data = state["data"]
    metadata = state["metadata"]
    show_reasoning = metadata.get("show_reasoning", True)

    # Get insider trades data - returns tuple of (bullish_signals, bearish_signals)
    insider_trades = data["insider_trades"]
    bullish_signals, bearish_signals = insider_trades  # Unpack the tuple
    
    # Calculate percentages
    total_signals = bullish_signals + bearish_signals
    bull_percentage = (bullish_signals / total_signals * 100) if total_signals > 0 else 0
    bear_percentage = (bearish_signals / total_signals * 100) if total_signals > 0 else 0
    
    # Determine dominant signal and confidence
    if bull_percentage > bear_percentage:
        signal = "BULLISH"
        confidence = bull_percentage
    else:
        signal = "BEARISH"
        confidence = bear_percentage

    # Create detailed reasoning
    reasoning = (
        f"Sentiment Analysis for {data['crypto']}:\n\n"
        f"1. Signal Distribution:\n"
        f"   • Bullish Signals: {bullish_signals:.0f} ({bull_percentage:.1f}%)\n"
        f"   • Bearish Signals: {bearish_signals:.0f} ({bear_percentage:.1f}%)\n"
        f"   • Total Signals: {total_signals:.0f}\n\n"
        f"2. Long/Short Ratio:\n"
        f"   • Current Ratio: {(bullish_signals/bearish_signals):.2f} (>1 indicates bullish bias)\n\n"
        f"3. Confidence Level:\n"
        f"   • {confidence:.1f}% based on dominant signal strength\n"
        f"   • Derived from {total_signals:.0f} total trading signals"
    )

    # Create message content
    message_content = {
        "signal": signal,
        "confidence": f"{confidence:.1f}%",
        "reasoning": reasoning
    }

    # Show reasoning if enabled
    if show_reasoning:
        show_agent_reasoning(message_content, "Sentiment Analysis Agent")

    # Create the sentiment analysis message
    message = HumanMessage(
        content=json.dumps(message_content),
        name="sentiment_agent",
    )

    return {
        "messages": [*messages, message],
        "data": {
            **data,
            "analyst_signals": {
                **data["analyst_signals"],
                "sentiment": {
                    "signal": signal,
                    "confidence": confidence
                }
            }
        },
        "metadata": metadata
    }
