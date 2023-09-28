from flask import Flask, request, current_app
import dotenv
import os
import requests
import json

from collections import defaultdict
from backend.ebay_oauth_token import OAuthToken


app = Flask(__name__, static_url_path="", static_folder="../frontend/static")
app.json.sort_keys = False

dotenv.load_dotenv(dotenv.find_dotenv())


def createPayload(data):
    keyword = data["keyword"]
    sort = data["sortBy"]

    # TODO: sometimes i only get lesser than 10 items than the total fetched items
    # https://piazza.com/class/lkyn4sr3nlj3/post/149
    payload = {
        "OPERATION-NAME": "findItemsByKeywords",
        "SERVICE-VERSION": "1.0.0",
        "SECURITY-APPNAME": os.getenv("APP_ID"),
        "RESPONSE-DATA-FORMAT": "JSON",
        "REST-PAYLOAD": "true",
        # "paginationInput.entriesPerPage": "100",
        "keywords": keyword,
        "sortOrder": sort,
    }

    item_filter_idx = 0

    # from_price = data["priceRange"]["from"]
    # to_price = data["priceRange"]["to"]

    from_price = data["fromPrice"]
    to_price = data["toPrice"]
    condition = data["conditions"]
    seller = data["seller"]
    shipping = data["shipping"]

    if from_price:
        payload[f"itemFilter({item_filter_idx}).name"] = "MinPrice"
        payload[f"itemFilter({item_filter_idx}).value"] = from_price
        payload[f"itemFilter({item_filter_idx}).paramName"] = "Currency"
        payload[f"itemFilter({item_filter_idx}).paramValue"] = "USD"
        item_filter_idx += 1

    if to_price:
        payload[f"itemFilter({item_filter_idx}).name"] = "MaxPrice"
        payload[f"itemFilter({item_filter_idx}).value"] = to_price
        payload[f"itemFilter({item_filter_idx}).paramName"] = "Currency"
        payload[f"itemFilter({item_filter_idx}).paramValue"] = "USD"
        item_filter_idx += 1

    if condition:
        payload[f"itemFilter({item_filter_idx}).name"] = "Condition"
        for val in condition:
            payload[
                f"itemFilter({item_filter_idx}).value({condition.index(val)})"
            ] = val
        item_filter_idx += 1

    if seller:
        payload[f"itemFilter({item_filter_idx}).name"] = "ReturnsAcceptedOnly"
        payload[f"itemFilter({item_filter_idx}).value"] = True
        item_filter_idx += 1

    if shipping:
        if "FreeShippingOnly" in shipping:
            payload[f"itemFilter({item_filter_idx}).name"] = "FreeShippingOnly"
            payload[f"itemFilter({item_filter_idx}).value"] = True
            item_filter_idx += 1
        if "ExpeditedShippingType" in shipping:
            payload[f"itemFilter({item_filter_idx}).name"] = "ExpeditedShippingType"
            payload[f"itemFilter({item_filter_idx}).value"] = "Expedited"
            item_filter_idx += 1

    print("=" * 100)
    print("Payload:", payload)
    print("=" * 100)

    # with open("payload.json", "w") as f:
    #     json.dump(payload, f)

    return payload


def cleanAllItemData(json_data):
    if json_data["findItemsByKeywordsResponse"][0]["ack"][0] == "Failure":
        return {"ack": "Failure"}
    else:
        if (
            json_data["findItemsByKeywordsResponse"][0]["searchResult"][0]["@count"]
            == "0"
        ):
            return {"ack": "Failure"}

        else:
            clean_json_data = {"ack": "Success", "total_fetched_items": 0, "items": []}

            fetched_items = json_data["findItemsByKeywordsResponse"][0]["searchResult"][
                0
            ]["item"]
            clean_json_data["total_fetched_items"] = json_data[
                "findItemsByKeywordsResponse"
            ][0]["paginationOutput"][0]["totalEntries"][0]

            for idx, item in enumerate(fetched_items):
                cleaned_item = {}
                cleaned_item["itemId"] = item["itemId"][0]
                cleaned_item["title"] = item["title"][0]
                cleaned_item["category"] = item["primaryCategory"][0]["categoryName"][0]

                condition_display_name = item.get("condition", [{}])[0].get(
                    "conditionDisplayName", "N/A"
                )

                if condition_display_name =="N/A":
                    continue

                cleaned_item["condition"] = condition_display_name

                cleaned_item["price"] = float(
                    item["sellingStatus"][0]["convertedCurrentPrice"][0]["__value__"]
                )

                shipping_cost = float(
                    item.get("shippingInfo", [{}])[0].get(
                        "shippingServiceCost", [{"__value__": 0.0}]
                    )[0]["__value__"]
                )
                cleaned_item["shipping"] = shipping_cost

                cleaned_item["topRatedListing"] = False

                if (item["topRatedListing"][0] == "true"):
                    cleaned_item["topRatedListing"] = True


                cleaned_item["link"] = item["viewItemURL"][0]
                cleaned_item["galleryURL"] = item["galleryURL"][0]

                clean_json_data["items"].append(cleaned_item)

                if idx == 9:
                    print("=" * 100)
                    print("Items fetched:", idx + 1)
                    print("=" * 100)
                    break

    # with open("cleaned-data-all-items.json", "w") as f:
    #     json.dump(clean_json_data, f)

    return clean_json_data


def cleanSingleItemData(json_data):
    clean_json_data = defaultdict(str)
    item_data = json_data["Item"]

    clean_json_data["Photo"] = item_data.get("PictureURL", ["res/ebay_default.jpg"])[0]
    clean_json_data["eBay Link"] = item_data.get("ViewItemURLForNaturalSearch", "")
    clean_json_data["Title"] = item_data.get("Title", "")
    clean_json_data["Subtitle"] = item_data.get("Subtitle", "")
    clean_json_data["Price"] = str(item_data["CurrentPrice"].get("Value", 0.0)) + " USD"
    clean_json_data["Location"] = (
        item_data.get("Location", "") + " " + item_data.get("PostalCode", "")
    )
    clean_json_data["Seller"] = item_data.get("Seller", {}).get("UserID", "")

    clean_json_data["Return Policy(US)"] = (
        item_data.get("ReturnPolicy", {}).get("ReturnsAccepted", "")
        + " within "
        + item_data.get("ReturnPolicy", {}).get("ReturnsWithin", "")
    )

    # clean_json_data["itemSpecs"] = defaultdict(str)
    for spec in item_data.get("ItemSpecifics", {}).get("NameValueList", []):
        clean_json_data[spec.get("Name", "")] = spec.get("Value", [""])[0]

    # with open("cleaned-data-single-item.json", "w") as f:
    # json.dump(clean_json_data, f)

    return clean_json_data


@app.route("/", methods=["GET"])
def index():
    print("Sending index.html to client")
    return current_app.send_static_file("index.html")


@app.route("/findAllItems", methods=["GET"])
def get_all_item():
    # https://stackoverflow.com/questions/24892035/how-can-i-get-the-named-parameters-from-a-url-using-flask
    keyword = request.args.get("keyword")
    from_price = request.args.get("fromPrice")
    to_price = request.args.get("toPrice")
    conditions = request.args.get("conditions")
    seller = request.args.get("seller")
    shipping = request.args.get("shipping")
    sort = request.args.get("sortBy")

    if conditions:
        conditions = conditions.split(",")

    data = {
        "keyword": keyword,
        "fromPrice": from_price,
        "toPrice": to_price,
        "conditions": conditions,
        "seller": seller,
        "shipping": shipping,
        "sortBy": sort,
    }

    print("=" * 100)
    print("Received data:", data)
    print("=" * 100)
    api_url = "https://svcs.ebay.com/services/search/FindingService/v1"
    payload = createPayload(data)
    print("Sending request to eBay API for all items")
    response = requests.get(api_url, params=payload)

    if response.status_code == 200:
        print(f"Sending response to client {response.status_code}")
        print("=" * 100)

        # saving response to json file
        # with open("respone-data-all-items.json", "w") as f:
        #     json.dump(response.json(), f)

        clean_json = cleanAllItemData(response.json())
        return clean_json
    else:
        return f"API request failed for all items {response.status_code}"


@app.route("/getSingleItem", methods=["GET"])
def get_single_item():
    oauth_utility = OAuthToken(os.getenv("APP_ID"), os.getenv("CERT_ID"))
    application_token = oauth_utility.getApplicationToken()

    try:
        item_id = request.args.get("itemId")
        print("=" * 100)
        print("Received Item ID:", item_id)
        print("=" * 100)

    except json.JSONDecodeError as e:
        print("Invalid Item ID")

    api_url = "https://open.api.ebay.com/shopping"

    headers = {"X-EBAY-API-IAF-TOKEN": application_token}
    payload = {
        "callname": "GetSingleItem",
        "responseencoding": "JSON",
        "appid": os.getenv("APP_ID"),
        "siteid": "0",
        "version": "967",
        "ItemID": item_id,
        "IncludeSelector": "Description,Details,ItemSpecifics",
    }

    print("Sending request to eBay API for single item")
    response = requests.get(api_url, params=payload, headers=headers)

    if response.status_code == 200:
        print(f"Sending response to client {response.status_code}")
        print("=" * 100)

        # saving response to json file
        # with open("respone-data-single-item.json", "w") as f:
        #     json.dump(response.json(), f)

        clean_json = cleanSingleItemData(response.json())
        return clean_json

    else:
        return f"API request failed for single item {response.status_code}"


if __name__ == "__main__":
    app.run(debug=True)
