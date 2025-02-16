import os
import pandas as pd
import requests
from datetime import datetime
from dotenv import load_dotenv
import json


load_dotenv(".env", override=True)

HYPERLIQUID_API_URL = os.environ.get("HYPERLIQUID_API_URL")
BINANCE_API_URL = os.environ.get("BINANCE_API_URL")
API_COPIN_OI = os.environ.get("API_COPIN_OI")


def date_to_timestamp(date):
    """
    Convert a date string or datetime object to millisecond timestamp.

    Args:
        date (str or datetime): Date in 'YYYY-MM-DD' format or datetime object

    Returns:
        int: Timestamp in milliseconds
    """
    if isinstance(date, str):
        date = datetime.strptime(date, "%Y-%m-%d")
    timestamp_seconds = datetime.timestamp(date)
    timestamp_milliseconds = int(timestamp_seconds * 1000)
    return timestamp_milliseconds


def get_price_API_HYPERLIQUID(pair, open_time, close_time):
    """
    Fetch historical price data from HyperLiquid API.

    Args:
        pair (str): Trading pair symbol
        open_time (str or datetime): Start time for data fetch
        close_time (str or datetime): End time for data fetch

    Returns:
        pandas.DataFrame: DataFrame containing OHLCV data with columns:
            - open: Opening price
            - close: Closing price
            - high: Highest price
            - low: Lowest price
            - volume: Trading volume
        str: Error message if request fails
    """
    open_time = date_to_timestamp(open_time)
    close_time = date_to_timestamp(close_time)
    APIURL = HYPERLIQUID_API_URL

    data = {
        "type": "candleSnapshot",
        "req": {
            "coin": pair,
            "interval": "1h",
            "startTime": open_time,
            "endTime": close_time,
        },
    }

    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(APIURL, json=data, headers=headers)
        data = response.json()
        df = pd.DataFrame(data)
        df.rename(
            columns={
                "t": "timestamp",
                "T": "close_time",
                "s": "symbol",
                "i": "interval",
                "o": "open",
                "c": "close",
                "h": "high",
                "l": "low",
                "v": "volume",
                "n": "number_of_trades",
            },
            inplace=True,
        )

        df = df[["open", "close", "high", "low", "volume"]]
        numeric_cols = ["open", "close", "high", "low", "volume"]
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        df.sort_index(inplace=True)

        return df
    except Exception as e:
        print(e)
        return "Cannot find price of this crypto"


def get_price_API_BINANCE(pair, open_time, close_time, limit: int = 1000):
    """
    Fetch historical price data from Binance Futures API.

    Args:
        pair (str): Trading pair symbol
        open_time (str or datetime): Start time for data fetch
        close_time (str or datetime): End time for data fetch
        limit (int, optional): Maximum number of records to return. Defaults to 1000

    Returns:
        pandas.DataFrame: DataFrame containing OHLCV data with columns:
            - open: Opening price
            - close: Closing price
            - high: Highest price
            - low: Lowest price
            - volume: Trading volume
        str: Error message if request fails
    """
    open_time = date_to_timestamp(open_time)
    close_time = date_to_timestamp(close_time)
    APIURL = BINANCE_API_URL + "/fapi/v1/continuousKlines"
    paramsMap = {
        "pair": pair,
        "contractType": "PERPETUAL",
        "interval": "1h",
        "startTime": open_time,
        "endTime": close_time,
        "limit": limit,
    }
    try:
        response = requests.get(APIURL, params=paramsMap)
        print(paramsMap)
        data = response.json()
        df = pd.DataFrame(
            data,
            columns=[
                "timestamp",
                "open",
                "high",
                "low",
                "close",
                "volume",
                "close_time",
                "quote_asset_volume",
                "number_of_trades",
                "taker_buy_base_asset_volume",
                "taker_buy_quote_asset_volume",
                "ignore",
            ],
        )

        df = df[["open", "close", "high", "low", "volume"]]
        numeric_cols = ["open", "close", "high", "low", "volume"]
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        df.sort_index(inplace=True)

        return df
    except Exception as e:
        print(e)
        return "Cannot find price of this crypto"


def get_OI_position_Copin(pair: str, isLong: bool):
    """
    Fetch open interest data for a specific position type from Copin API.

    Args:
        pair (str): Trading pair symbol (without -USDT suffix)
        isLong (bool): True for long positions, False for short positions

    Returns:
        float: Total size of open interest for the specified position type
        str: Error message if request fails
    """
    APIURL = API_COPIN_OI
    pair = pair + "-USDT"
    if isLong:
        value_long = "true"
    else:
        value_long = "false"
    query = {
        "pagination": {"limit": 500, "offset": 0},
        "queries": [
            {"fieldName": "pair", "value": pair},
            {"fieldName": "isLong", "value": value_long},
        ],
        "sortBy": "size",
        "sortType": "desc",
    }
    headers = {"Content-Type": "application/json"}
    try:
        response = requests.post(APIURL, headers=headers, data=json.dumps(query))
        data = response.json()
        df = data["data"]
        total_size = sum(d["size"] for d in df)
        return total_size
    except Exception as e:
        print(e)
        return "Cannot find OI of this crypto"


def get_LS_OI_Copin(pair):
    """
    Fetch both long and short open interest data from Copin API.

    Args:
        pair (str): Trading pair symbol (without -USDT suffix)

    Returns:
        tuple: (long_oi, short_oi) containing the total open interest for long and short positions
        str: Error message if request fails
    """
    longOI = get_OI_position_Copin(pair, True)
    shortOI = get_OI_position_Copin(pair, False)
    if isinstance(longOI, str) | isinstance(shortOI, str):
        return "Cannot find OI of this crypto"

    return longOI, shortOI
