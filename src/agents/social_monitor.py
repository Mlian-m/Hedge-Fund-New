from langchain_core.messages import HumanMessage
from agents.state import AgentState, show_agent_reasoning
import json
import os
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import socket
import dns.resolver

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), "../../.env")
load_dotenv(dotenv_path)

LUNARCRUSH_API_KEY = os.getenv("LUNARCRUSH_API_KEY")
LUNARCRUSH_API_URL = "https://lunarcrush.com/api4/public"

# Map of crypto symbols to their topic names for LunarCrush API
CRYPTO_TOPIC_MAP = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "LINK": "chainlink",
    "AVAX": "avalanche",
    "MATIC": "polygon",
    "DOT": "polkadot",
    "ADA": "cardano",
    "XRP": "ripple",
    "DOGE": "dogecoin",
    "SHIB": "shiba-inu",
    "UNI": "uniswap",
    "AAVE": "aave",
    "SNX": "synthetix",
    "OP": "optimism",
    "ARB": "arbitrum"
}

# Configuration for LunarCrush API4
LUNARCRUSH_CONFIG = {
    "update_interval": 300,  # 5 minutes
    "endpoints": {
        "topic": "/topic/{topic}/v1",  # For social metrics
        "coins": "/coins/list/v1",     # For AltRank and Social Dominance
        "influencers": "/influencers/list/v1",
        "feeds": "/feeds/list/v1"
    },
    "metrics": {
        "required": [
            "total_posts",
            "total_contributors",
            "total_reach",
            "sentiment_relative"
        ],
        "optional": [
            "twitter_posts",
            "reddit_posts",
            "news_posts",
            "search_volume"
        ]
    },
    "sentiment_weights": {
        "social_volume": 0.2,
        "social_engagement": 0.3,
        "social_contributors": 0.2,
        "social_sentiment": 0.3
    },
    "cache_duration": 300,  # 5 minutes
    "max_news_age": 3600,  # 1 hour
    "min_engagement": 1000
}

def resolve_dns(hostname):
    """
    Attempt to resolve DNS for a hostname with multiple DNS servers
    """
    dns_servers = [
        '8.8.8.8',  # Google DNS
        '1.1.1.1',  # Cloudflare DNS
        '208.67.222.222'  # OpenDNS
    ]
    
    for dns_server in dns_servers:
        try:
            resolver = dns.resolver.Resolver()
            resolver.nameservers = [dns_server]
            resolver.timeout = 3
            resolver.lifetime = 3
            answers = resolver.resolve(hostname)
            return str(answers[0])
        except Exception as e:
            print(f"DNS resolution failed with {dns_server}: {str(e)}")
            continue
    return None

def create_session_with_retries():
    """Create a requests session with retry logic"""
    session = requests.Session()
    
    # Configure retry strategy with more specific status codes
    retries = Retry(
        total=3,  # Number of retries
        backoff_factor=0.5,  # Wait 0.5, 1, 2 seconds between retries
        status_forcelist=[408, 429, 500, 502, 503, 504],
        allowed_methods=["GET"],
        respect_retry_after_header=True,
        raise_on_status=True
    )
    
    # Configure the adapter with longer timeouts
    adapter = HTTPAdapter(
        max_retries=retries,
        pool_connections=10,
        pool_maxsize=10,
        pool_block=False
    )
    
    # Mount the adapter for both HTTP and HTTPS
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    return session

def extract_hostname(url):
    """Extract hostname from URL"""
    from urllib.parse import urlparse
    return urlparse(url).netloc

def get_coin_metrics(symbol: str):
    """
    Fetch AltRank and Social Dominance from LunarCrush coins/list endpoint
    """
    if not LUNARCRUSH_API_KEY:
        print("Warning: LUNARCRUSH_API_KEY not found in environment variables")
        return None
    
    session = create_session_with_retries()
    
    try:
        # Use the /coins/list endpoint
        endpoint = f"{LUNARCRUSH_API_URL}/coins/list/v1"
        print(f"\nFetching coin metrics from: {endpoint}")
        
        headers = {
            'Authorization': f'Bearer {LUNARCRUSH_API_KEY}',
            'Accept': 'application/json'
        }
        
        response = session.get(
            endpoint,
            headers=headers,
            timeout=10,
            verify=True
        )
        
        response.raise_for_status()
        data = response.json()
        
        if not data or "data" not in data:
            print("No data found in coins API response")
            return None
            
        # Find the coin in the list
        coin_data = None
        for coin in data["data"]:
            if coin.get("symbol") == symbol.upper():
                coin_data = coin
                break
        
        if not coin_data:
            print(f"No coin data found for {symbol}")
            return None
            
        # Extract AltRank and Social Dominance
        result = {
            "alt_rank": int(coin_data.get("alt_rank", 0)),
            "alt_rank_previous": int(coin_data.get("alt_rank_previous", 0)),
            "social_dominance": float(coin_data.get("social_dominance", 0))
        }
        
        print(f"\nCoin Metrics for {symbol}:")
        print(json.dumps(result, indent=2))
        
        return result
            
    except Exception as e:
        print(f"Error fetching coin metrics: {str(e)}")
        return None

def get_lunarcrush_data(symbol: str):
    """
    Fetch social metrics from LunarCrush API4 with improved error handling and retries.
    """
    if not LUNARCRUSH_API_KEY:
        print("Warning: LUNARCRUSH_API_KEY not found in environment variables")
        return None
    
    session = create_session_with_retries()
    
    try:
        # Convert symbol to topic name
        topic = CRYPTO_TOPIC_MAP.get(symbol.upper())
        if not topic:
            print(f"No topic mapping found for symbol {symbol}")
            return None
            
        # Use the /topic endpoint with the topic name
        endpoint = f"{LUNARCRUSH_API_URL}/topic/{topic}/v1"
        print(f"\nTrying LunarCrush API endpoint: {endpoint}")
        
        # Headers for API4
        headers = {
            'Authorization': f'Bearer {LUNARCRUSH_API_KEY}',
            'Accept': 'application/json'
        }
        
        print(f"Fetching LunarCrush data for {symbol} (topic: {topic})...")
        
        # Set explicit timeout and verify SSL
        response = session.get(
            endpoint,
            headers=headers,
            timeout=10,
            verify=True
        )
        
        response.raise_for_status()
        data = response.json()
        
        if not data:
            print(f"No data found in API response")
            print("API Response:", data)
            return None
            
        # Debug: Print raw API response
        print("\nRaw LunarCrush API Response:")
        print(json.dumps(data, indent=2))
        
        # Extract metrics based on API4 topic endpoint response format
        result = {
            "social_volume": float(data["data"].get("num_posts", 0)),  # Total posts
            "social_contributors": float(data["data"].get("num_contributors", 0)),  # Total contributors
            "social_engagement": float(data["data"].get("interactions_24h", 0)),  # 24h interactions
            "social_sentiment": float(data["data"].get("types_sentiment", {}).get("tweet", 50)) / 100,  # Tweet sentiment
            "average_sentiment": float(data["data"].get("types_sentiment", {}).get("tweet", 50)) / 100,  # Average sentiment
            "tweet_sentiment_impact": float(data["data"].get("interactions_24h", 0)),  # Interaction impact
            "percent_change_24h": float(data.get("price_change_24h", 0)),
            # Sentiment breakdown from types_sentiment_detail
            "tweet_sentiment5": float(data["data"].get("types_sentiment_detail", {}).get("tweet", {}).get("positive", 0)),  # Bullish
            "tweet_sentiment4": float(data["data"].get("types_sentiment_detail", {}).get("tweet", {}).get("neutral", 0)),   # Neutral
            "tweet_sentiment1": float(data["data"].get("types_sentiment_detail", {}).get("tweet", {}).get("negative", 0)),   # Bearish
        }
        
        # Get additional coin metrics
        coin_metrics = get_coin_metrics(symbol)
        if coin_metrics:
            result.update({
                "alt_rank": coin_metrics["alt_rank"],
                "alt_rank_previous": coin_metrics["alt_rank_previous"],
                "social_dominance": coin_metrics["social_dominance"]
            })
        else:
            # Instead of using placeholder values, don't include these metrics
            print(f"Warning: Could not fetch AltRank and Social Dominance metrics for {symbol}")
        
        # Debug: Print extracted metrics
        print("\nExtracted Metrics:")
        print(json.dumps(result, indent=2))
        
        print(f"Successfully fetched data for {symbol}")
        return result
            
    except requests.exceptions.Timeout:
        print(f"Timeout while fetching LunarCrush data")
        return None
    except requests.exceptions.ConnectionError as e:
        print(f"Connection error while fetching LunarCrush data: {str(e)}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching LunarCrush data: {str(e)}")
        return None
    except (KeyError, TypeError, ValueError) as e:
        print(f"Error processing LunarCrush data: {str(e)}")
        return None
    except Exception as e:
        print(f"Unexpected error in LunarCrush data fetch: {str(e)}")
        return None

def social_monitor_agent(state: AgentState):
    """
    Analyzes social media sentiment and trends for cryptocurrency trading signals
    using LunarCrush API data.
    
    Args:
        state (AgentState): Current state containing:
            - messages: List of conversation messages
            - data: Dict containing crypto and date information
            - metadata: Dict containing configuration options
            
    Returns:
        dict: Updated state with social monitoring signals
    """
    try:
        messages = state["messages"]
        data = state["data"]
        metadata = state["metadata"]
        show_reasoning = metadata.get("show_reasoning", True)
        
        crypto = data["crypto"]
        print(f"\nAnalyzing social sentiment for {crypto}...")
        
        # Fetch real data from LunarCrush
        social_metrics = get_lunarcrush_data(crypto)
        
        if not social_metrics:
            print(f"No social metrics available for {crypto}, using neutral stance")
            message_content = {
                "signal": "NEUTRAL",
                "confidence": "50.0%",
                "reasoning": f"Unable to fetch social metrics for {crypto}. Defaulting to neutral stance.",
                "social_metrics": None,
                "sentiment_score": 0.5
            }
        else:
            try:
                # Calculate sentiment score from various metrics
                sentiment_score = calculate_sentiment_score(social_metrics)
                
                # Generate detailed reasoning with new metrics section
                reasoning = (
                    f"Social Media Analysis for {crypto}:\n\n"
                    f"1. Social Metrics:\n"
                    f"   • Volume: {social_metrics['social_volume']:,}\n"
                    f"   • Contributors: {social_metrics['social_contributors']:,}\n"
                    f"   • Engagement: {social_metrics['social_engagement']:,}\n\n"
                    f"2. Sentiment Analysis:\n"
                    f"   • Average Sentiment: {social_metrics['average_sentiment']:.2f}\n"
                    f"   • Sentiment Impact: {social_metrics['tweet_sentiment_impact']:,}\n"
                    f"   • 24h Change: {social_metrics['percent_change_24h']:.2f}%\n\n"
                    f"3. Tweet Sentiment:\n"
                    f"   • Bullish Posts: {social_metrics['tweet_sentiment5']:,}\n"
                    f"   • Neutral Posts: {social_metrics['tweet_sentiment4']:,}\n"
                    f"   • Bearish Posts: {social_metrics['tweet_sentiment1']:,}\n\n"
                    f"4. Social Strength:\n"
                    f"   • AltRank™: #{social_metrics['alt_rank']} (Performance score relative to all assets)\n"
                    f"   • Social Dominance: {social_metrics['social_dominance']:.1f}% (% of total social volume)\n\n"
                    f"5. Overall Sentiment Score: {sentiment_score:.2f}"
                )
                
                # Determine signal strength and direction
                if sentiment_score > 0.6:
                    signal = "BULLISH"
                    confidence = sentiment_score * 100
                elif sentiment_score < 0.4:
                    signal = "BEARISH"
                    confidence = (1 - sentiment_score) * 100
                else:
                    signal = "NEUTRAL"
                    confidence = 50
                
                message_content = {
                    "signal": signal,
                    "confidence": f"{confidence:.1f}%",
                    "reasoning": reasoning,
                    "social_metrics": social_metrics,
                    "sentiment_score": sentiment_score
                }
            except Exception as e:
                print(f"Error calculating sentiment: {str(e)}")
                message_content = {
                    "signal": "NEUTRAL",
                    "confidence": "50.0%",
                    "reasoning": f"Error calculating sentiment for {crypto}. Defaulting to neutral stance.",
                    "social_metrics": None,
                    "sentiment_score": 0.5
                }
        
        # Show reasoning if enabled
        if show_reasoning:
            show_agent_reasoning(message_content, "Social Monitor Agent")
        
        # Create the social monitor message
        message = HumanMessage(
            content=json.dumps(message_content),
            name="social_monitor_agent",
        )
        
        return {
            "messages": [*messages, message],
            "data": {
                **data,
                "social_metrics": social_metrics,
                "sentiment_score": message_content["sentiment_score"],
            },
            "metadata": metadata
        }
    except Exception as e:
        print(f"Error in social monitor agent: {str(e)}")
        # Return neutral sentiment on error
        message = HumanMessage(
            content=json.dumps({
                "signal": "NEUTRAL",
                "confidence": "50.0%",
                "reasoning": "Error in social sentiment analysis. Defaulting to neutral stance.",
                "social_metrics": None,
                "sentiment_score": 0.5
            }),
            name="social_monitor_agent",
        )
        return {
            "messages": [*messages, message],
            "data": {**data, "social_metrics": None, "sentiment_score": 0.5},
            "metadata": metadata
        }

def calculate_sentiment_score(metrics):
    """
    Calculates an overall sentiment score from LunarCrush metrics using configured weights.
    """
    try:
        if not metrics:
            return 0.5  # Neutral score if no metrics
            
        # Use weights from config
        weights = LUNARCRUSH_CONFIG["sentiment_weights"]
        
        # Calculate normalized metrics (0-1 scale)
        normalized_metrics = {
            "social_volume": min(1.0, metrics["social_volume"] / LUNARCRUSH_CONFIG["min_engagement"]),
            "social_engagement": min(1.0, metrics["social_engagement"] / LUNARCRUSH_CONFIG["min_engagement"]),
            "social_contributors": min(1.0, metrics["social_contributors"] / LUNARCRUSH_CONFIG["min_engagement"]),
            "social_sentiment": metrics["social_sentiment"]  # Already 0-1 scale
        }
        
        # Calculate weighted score
        score = sum(
            normalized_metrics[metric] * weight 
            for metric, weight in weights.items()
        )
        
        # Ensure score is in 0-1 range
        return max(0, min(1, score))
        
    except Exception as e:
        print(f"Error calculating sentiment score: {str(e)}")
        return 0.5  # Return neutral score on error 