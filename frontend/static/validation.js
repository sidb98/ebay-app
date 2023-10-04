document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("clear").addEventListener("click", (event) => {
        clearSearch();
    });



    document.getElementById("submit").addEventListener("click", (event) => {
        event.preventDefault();
        handleFormSubmit();
    });

    document.getElementById("back-to-search").addEventListener("click", (event) => {
        event.preventDefault();
        const backToSearchButton = document.getElementById("back-to-search");
        backToSearchButton.style.display = 'none';

        const line = document.getElementById("line");
        line.style.display = '';

        const itemResults = document.getElementById("item-results");
        itemResults.style.display = '';

        const toggleButton = document.getElementById("toggle-button");
        toggleButton.style.display = '';

        const singleItemResults = document.getElementById("single-item-results");
        singleItemResults.style.display = 'none';

        const itemDetailsLabel = document.getElementById("item-details-label");
        itemDetailsLabel.style.display = 'none';

        noResults = document.getElementById("no-results");
        noResults.style.display = '';
    });

    document.getElementById("toggle-button").addEventListener("click", (event) => {
        event.preventDefault();
        const toggleButton = document.getElementById('toggle-button');
        const items = document.querySelectorAll('.item');

        if (toggleButton.value == 'Show More') {
            items.forEach(item => {
                item.style.display = '';
            }
            );
            toggleButton.value = 'Show Less';
            console.log("Toggle button showing more items");

        }
        else {
            items.forEach((item, index) => {
                if (index > 2) item.style.display = 'none';
            }
            );
            toggleButton.value = 'Show More';
            console.log("Toggle button showing less items");
        }


    });
});


function displaySearch() {
    document.getElementById("no-results").style.display = "block";
    document.getElementById("line").style.display = "block";
    document.getElementById("item-results").style.display = "block";
    document.getElementById("toggle-button").value = "Show More";
    document.getElementById("toggle-button").style.display = "block";

}


function clearSearch() {
    document.getElementById("no-results").innerHTML = "";
    document.getElementById("item-results").innerHTML = "";
    document.getElementById("toggle-button").value = "Show More";
    document.getElementById("toggle-button").style.display = "none";
    document.getElementById("back-to-search").style.display = "none";
    document.getElementById("single-item-results").style.display = "none";
    document.getElementById("item-details-label").style.display = "none";
    document.getElementById("line").style.display = "none";
}

function validateForm() {

    if (!document.getElementById("keyword").reportValidity()) {
        console.log("Form validation failed");
        return false;
    }


    const fromValue = parseFloat(document.getElementById("from").value);
    const toValue = parseFloat(document.getElementById("to").value);

    if (fromValue > toValue) {
        alert("Oops! Lower price limit cannot be greater than upper price limit.\nPlease try again.");
        console.log("Form validation failed");
        return false;
    }

    if (fromValue < 0 || toValue < 0) {
        alert("Price Range values cannot be negative.Please try a value greater than or equal to 0.0");
        console.log("Form validation failed");
        return false;
    }
    console.log("Form validated successfully");
    return true;
}

function buildJsonData() {

    // "how to put all the selected options from this form into a json object?" prompt(2 line). ChatGPT3.5, 11 Sep ChatGPT August 3 Version

    var jsonObject = {};

    jsonObject.keyword = document.getElementById("keyword").value;


    const fromPrice = document.getElementById("from").value;
    if (fromPrice != "") jsonObject.fromPrice = fromPrice;

    const toPrice = document.getElementById("to").value;
    if (toPrice != "") jsonObject.toPrice = toPrice;

    var conditions = [];
    if (document.getElementById("new").checked) conditions.push("1000");
    if (document.getElementById("used").checked) conditions.push("3000");
    if (document.getElementById("verygood").checked) conditions.push("4000");
    if (document.getElementById("good").checked) conditions.push("5000");
    if (document.getElementById("acceptable").checked) conditions.push("6000");

    if (conditions.length != 0) jsonObject.conditions = conditions;


    // if (!document.getElementById("return").checked) jsonObject.seller = "";
    if (document.getElementById("return").checked) jsonObject.seller = "Return Accepted";

    var shipping = [];
    if (document.getElementById("free").checked) shipping.push("FreeShippingOnly");

    // Uncomment the below line to enable expedited shipping
    // if (document.getElementById("expedited").checked) shipping.push("ExpeditedShippingType");
    if (shipping.length != 0) jsonObject.shipping = shipping;

    jsonObject.sortBy = document.getElementById("sortby").value;

    return jsonObject;
}



function sendSearchDataToBackend(jsonObject) {
    
    // From https://stackoverflow.com/questions/111529/how-to-create-query-parameters-in-javascript

    const searchParams = new URLSearchParams(jsonObject).toString();
    console.log("Search Params: " + searchParams);


    const url = `/findAllItems?`+searchParams;
    console.log("URL: " + url)


    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };

    fetch(url, options)
        .then(response => {
            if (response.ok) {
                console.log('Search parameters sent successfully to Flask');
                return response.json();
            } else {
                console.error('Error sending data to Flask: ' + response.status);
            }
        })
        .then(data => {
            reponseData = data;
            console.log('JSON response from Flask for all items:');
            console.log(reponseData)
            populateResults(reponseData);
        })
        .catch(error => {
            console.error('Network error:', error);
        });

}

function handleFormSubmit() {
    if (validateForm()) {
        var jsonData = buildJsonData();
        sendSearchDataToBackend(jsonData);
        return true;
    }

    return false;
}

function allItemsTemplate(item) {
    const itemContainer = document.createElement('div');
    itemContainer.classList.add('item');

    const imageContainer = document.createElement('div');
    imageContainer.classList.add('image-container');

    const image = document.createElement('img');
    image.src = item.galleryURL;

    const textElement = document.createElement('div');
    textElement.classList.add('text-container');

    const title = document.createElement('h3');
    title.textContent = item.title;

    const category = document.createElement('p');
    category.classList.add('category');
    category.innerHTML = `Category: <em>${item.category}</em>`;

    const redirectImage = document.createElement('img');
    redirectImage.classList.add('redirect-image');

    const condition = document.createElement('p');
    condition.textContent = `Condition: ${item.condition}`;

    if(item.condition == "N/A") condition.style.visibility = 'hidden';


    if (item.topRatedListing) {
        const topRatedImage = document.createElement('img');
        topRatedImage.classList.add('top-rated-image');
        condition.appendChild(topRatedImage);
    }

    const price = document.createElement('p');
    price.style.fontWeight = 'bold';
    if (item.shipping != 0)
        price.textContent = `Price: $${item.price} (+ $${item.shipping} for shipping)`;
    else
        price.textContent = `Price: $${item.price}`;

    if(item.price == 0) price.style.visibility = 'hidden';

    category.appendChild(redirectImage);

    textElement.appendChild(title);
    textElement.appendChild(category);
    textElement.appendChild(condition);
    textElement.appendChild(price);


    imageContainer.appendChild(image);

    itemContainer.appendChild(imageContainer);
    itemContainer.appendChild(textElement);

    itemContainer.onclick = () => {
        sendSingleItemToBackend(item);
    };

    return itemContainer;
}

function populateResults(responseData) {

    clearSearch();
    const noResults = document.getElementById("no-results");
    const keyword = document.getElementById("keyword").value;

    if (responseData.ack == "Failure") {
        noResults.style.display = '';
        noResults.textContent = `No results found`;
        return;
    }

    noResults.style.display = ''
    noResults.innerHTML = `${responseData.total_fetched_items} results found for <em>${keyword}</em>`;


    const parentContainer = document.getElementById("item-results")

    itemList = responseData.items

    itemList.forEach((element, index) => {
        const item = allItemsTemplate(element);

        if (index < 3) item.style.display = '';
        else item.style.display = 'none';

        parentContainer.appendChild(item);

    });
    console.log("Results populated successfully for all items");

    const toggleButton = document.getElementById('toggle-button');
    toggleButton.style.display = '';

    displaySearch();
}

function populateSingleItem(responseData) {

    backToSearchButton = document.getElementById("back-to-search");
    backToSearchButton.style.display = '';

    itemResults = document.getElementById("item-results");
    itemResults.style.display = 'none';

    line = document.getElementById("line");
    line.style.display = 'none';

    toggleButton = document.getElementById("toggle-button");
    toggleButton.style.display = 'none';

    itemDetailsLabel = document.getElementById("item-details-label");
    itemDetailsLabel.style.display = '';

    noResults = document.getElementById("no-results");
    noResults.style.display = 'none';

    const parentContainer = document.getElementById("single-item-results")
    parentContainer.style.display = '';
    parentContainer.innerHTML = "";

    const tableContainer = document.createElement('table');
    tableContainer.classList.add('table');



    Object.keys(responseData).forEach(key => {

        if (responseData[key] != "") {

            const row = document.createElement('tr');
            const labelCell = document.createElement('th');
            labelCell.textContent = key;

            const valueCell = document.createElement('td');

            if (key == "Photo") {
                const image = document.createElement('img');
                image.src = responseData[key];
                image.width = 200;
                image.height = 200;
                valueCell.appendChild(image);
            }
            else if (key == "eBay Link") {
                const link = document.createElement('a');
                link.href = responseData[key];
                link.textContent = "eBay Product Link";
                link.target = "_blank";
                valueCell.appendChild(link);
            }
            else
                valueCell.textContent = responseData[key];

            row.appendChild(labelCell);
            row.appendChild(valueCell);

            tableContainer.appendChild(row);
        }
    });

    parentContainer.appendChild(tableContainer);

    console.log("Results populated successfully for single item");

}

function sendSingleItemToBackend(item) {

    const url = `/getSingleItem?itemId=${(item.itemId)}`;

    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };

    fetch(url, options)
        .then(response => {
            if (response.ok) {
                console.log('Single Item data sent successfully to Flask');
                return response.json();
            } else {
                console.error('Error sending data to Flask: ' + response.status);
            }
        })
        .then(data => {
            reponseData = data;
            console.log('JSON response from Flask for single item:');
            console.log(reponseData)
            populateSingleItem(reponseData);
        })
        .catch(error => {
            console.error('Network error:', error);
        });
}

