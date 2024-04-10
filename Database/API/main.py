from flask import Flask, request, jsonify
from pymongo import MongoClient

app = Flask(__name__)

# MongoDB connection string.
# Replace the below connection string with your actual connection string.
mongo_uri ="mongodb+srv://tomto:12345@cluster0.lzvmtde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(mongo_uri)

# Connect to the database and collection. Adjust 'yourDatabase' and 'yourCollection' accordingly.
db = client['Cluster0']
collection = db['MBotSensoren']

@app.route('/store', methods=['POST'])
def store_data():
    data = request.json  # Get JSON data from the request
    if not data:
        return jsonify({"error": "Missing data"}), 400

    try:
        # Insert data into MongoDB
        collection.insert_one(data)
        return jsonify({"message": "Data stored successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/fetch', methods=['GET'])
def fetch_data():
    # Try to convert the provided 'amount' to an integer, default to None if not provided
    amount = request.args.get('amount', default=None, type=int)

    try:
        if amount is not None and amount > 0:
            # Fetch the last 'amount' of entries, sorted by the most recent
            data_cursor = collection.find().sort('timestamp', -1).limit(amount)
        else:
            # Fetch all entries sorted by the most recent
            data_cursor = collection.find().sort('timestamp', -1)

        # Convert cursor to list (consider limiting the fields to return)
        data_list = list(data_cursor)

        # Assuming you're storing ObjectId, which is not JSON serializable, remove it or convert to string
        for data in data_list:
            data['_id'] = str(data['_id'])

        return jsonify(data_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True)