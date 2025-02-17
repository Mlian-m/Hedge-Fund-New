def portfolio_management_agent(state: AgentState):
    """
    Makes final trading decisions based on all agent signals
    """
    messages = state["messages"]
    data = state["data"]
    metadata = state["metadata"]
    
    # Extract signals from each agent
    technical_signal = None
    sentiment_signal = None
    social_signal = None
    risk_metrics = None
    
    for message in messages:
        if message.name == "technical_analyst_agent":
            technical_signal = json.loads(message.content)
        elif message.name == "sentiment_agent":
            sentiment_signal = json.loads(message.content)
        elif message.name == "social_monitor_agent":
            social_signal = json.loads(message.content)
        elif message.name == "risk_management_agent":
            risk_metrics = json.loads(message.content)
    
    if not all([technical_signal, sentiment_signal, social_signal, risk_metrics]):
        raise ValueError("Missing required signals from agents")
    
    # Weight configuration
    weights = {
        "technical": 0.25,
        "sentiment": 0.10,
        "social": 0.15,
        "risk": 0.50
    }
    
    # Convert confidence percentages to decimals
    technical_confidence = float(technical_signal.get("confidence", "50").strip("%")) / 100
    sentiment_confidence = float(sentiment_signal.get("confidence", "50").strip("%")) / 100
    social_confidence = float(social_signal.get("confidence", "50").strip("%")) / 100
    
    # Normalize signals to -1 (bearish) to 1 (bullish)
    def normalize_signal(signal):
        if isinstance(signal, dict):
            signal = signal.get("signal", "neutral")
        signal = signal.lower()
        if signal in ["bullish", "buy", "long"]:
            return 1
        elif signal in ["bearish", "sell", "short"]:
            return -1
        return 0
    
    technical_value = normalize_signal(technical_signal) * technical_confidence * weights["technical"]
    sentiment_value = normalize_signal(sentiment_signal) * sentiment_confidence * weights["sentiment"]
    social_value = normalize_signal(social_signal) * social_confidence * weights["social"]
    
    # Calculate final weighted signal
    total_signal = technical_value + sentiment_value + social_value
    
    # Apply risk management
    max_position = float(risk_metrics["max_position_margin"])
    risk_metrics = risk_metrics["risk_metrics"]
    
    # Determine final signal
    if abs(total_signal) < 0.1:
        final_signal = "NEUTRAL"
        confidence = 50.0
        position_size = 0
    else:
        final_signal = "BULLISH" if total_signal > 0 else "BEARISH"
        confidence = min(abs(total_signal) * 100, 100)
        position_size = max_position if total_signal > 0 else -max_position
    
    message_content = {
        "signal": final_signal,
        "confidence": f"{confidence:.1f}%",
        "position_size": position_size,
        "stop_loss": risk_metrics["stop loss"],
        "take_profit": risk_metrics["take profit"],
        "reasoning": f"""Portfolio Analysis:
1. Technical Analysis ({weights['technical']*100}%):
   • Signal: {technical_signal['signal']}
   • Confidence: {technical_signal['confidence']}

2. Sentiment Analysis ({weights['sentiment']*100}%):
   • Signal: {sentiment_signal['signal']}
   • Confidence: {sentiment_signal['confidence']}

3. Social Analysis ({weights['social']*100}%):
   • Signal: {social_signal['signal']}
   • Confidence: {social_signal['confidence']}

4. Risk Management ({weights['risk']*100}%):
   • Max Position: {max_position}
   • Stop Loss: {risk_metrics['stop loss']}
   • Take Profit: {risk_metrics['take profit']}

Final Decision:
• Signal: {final_signal}
• Confidence: {confidence:.1f}%
• Position Size: {position_size}"""
    }
    
    if metadata.get("show_reasoning", True):
        show_agent_reasoning(message_content, "Portfolio Manager")
    
    message = HumanMessage(
        content=json.dumps(message_content),
        name="portfolio_manager"
    )
    
    return {
        "messages": [*messages, message],
        "data": {**data, "portfolio_decision": message_content},
        "metadata": metadata
    } 