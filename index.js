var express = require('express');
var app = express();
var async = require('async');
var concur = require('concur-platform');
var config = require('./config');

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded() ); // to support URL-encoded bodies

app.get('/', function(request, response) {
  response.send('Hello World!');
});

app.post('/expense', function(req, res) {
	var selected_items = req.body;
	//console.log(util.inspect(req.body, false, null));

	var count = 0;
	var item_count = Object.keys(selected_items).length;

	console.log("length: " + item_count);

	async.whilst(
		function () { return count < item_count; },
		function (callback) {
			count++;
			sendQuickExpense(selected_items[count -1], callback);
		},
		function (err) {
			res.send("Quick expense created!");
		}
	);
});

function sendQuickExpense(item, callback) {
	var itemArr = item.split("/");
	var amount = itemArr[0];
	var comment = itemArr[1];

	var now = new Date();
	var year = now.getFullYear();
	var month = now.getMonth();
	var date = now.getDate();

	var fullDate = year + '-' + (month +1) + '-' + date;

	var concurBody = {
		"CurrencyCode": "USD",
		"TransactionAmount": amount,
		"VendorDescription": comment,
		"TransactionDate": fullDate
	}

	var options = {
		oauthToken: config.concur.accessToken,
		contentType:'application/json',
		body:concurBody
	};

	concur.quickexpenses.send(options)
	.then(function(data){
		console.log("QuickExpense created! " + amount);
		callback();
	})
	.fail(function (error) {
		//Error contains the error returned
		console.log(error);
	});
}

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
