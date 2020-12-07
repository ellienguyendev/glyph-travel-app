module.exports = {

    'url' : `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@${process.env.CLUSTER_NAME}.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`,
    'dbName': process.env.DB_NAME
};

// npm start .env to run
