## Web Speech API (Chrome) to submit expense to Concur
This code demonstrates how to submit business expense with voice using the [Web Speech API](http://dvcs.w3.org/hg/speech-api/raw-file/tip/speechapi.html)  and the [Concur SDK](https://github.com/concur/concur-platform-sdk-js).  You can check out the demo video [here](https://www.youtube.com/watch?v=paCuZL-6drw)

<img src="https://jfqcza.bn1301.livefilestore.com/y2pL04qUEGxVy3xvmjgX8oGUfJxAaRQ3-onuryF7N7vxZehbsmE4_T9IEe7FqKlkEAnPBG6V4iT_FspUcKfaWGPXuPmbvtyo0S_XzRGh1z4eEdR_aX-5GbyqL34WYx8VoVQ/ConcurWebSpeechDiagram.PNG?psid=1" width="800px" />

The diagram above describes the flow of the demo, and the file/code where each logic is located.  The Code section below will explain how this all works. This code uses the HTML5 Audio API (use Chrome) to record voice, and node.js to drive the backend (primarily to accept client calls and call out web APIs). 

### Configuration
You would need to sign up a Concur developer sandbox account and generate an access token:

- [Concur Developer Sign-up page](https://developer.concur.com/register)
- [Generate Concur Developer access token](https://developer.concur.com/oauth-20/native-flow)
- [Video on how to generate Concur access token](https://www.youtube.com/watch?v=Cy2rPV_I03w)

Once you have your access token, you can plug it in at `config.js` like below:

    config.concur.accessToken = "<insert Concur access token here>";

### Code
Please refer to the diagram at the top of this README to follow the code explanation below:

1. Tap the microphone icon on the app to start recording voice. Tap it again to end recording.  You can pause in between sentences to add a new expense item.
2. After the spoken words have been 'recognized' and translated into text by the Web Speech API, you can pick out the items that you want to send as expense to Concur (e.g. you can leave out incorrect recognitions, etc).  After selecting the items by checkbox, they are transformed into a format similar to `5.43/coffee` and sent to nodejs.  These are done by the three functions below:
             
		function sendToConcur() {

			var itemsToSend = getSelectedItems();
			if(!itemsToSend) {
				bootbox.alert("Please select an item to expense..", function() {});
				return;
			}

			// set up call to nodejs/express to send selected items
			var xhr = new XMLHttpRequest();
			xhr.open("POST", '/expense', true);
			xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

			xhr.send(JSON.stringify(itemsToSend));
			$body.addClass("loading");

			// receive response from server
			xhr.onloadend = function () {
				var response = xhr.responseText;
				$body.removeClass("loading");
				bootbox.alert(response, function() {});
			}
	  	}

		// iterates through checkbox group to pick out and format selected items
		function getSelectedItems() {
			var check_group = document.getElementsByName("chk_group");

			var selected_items = {};
			var ctr = 0;
			for(var i = 0; i < check_group.length; i++) {
				if(check_group[i].checked == true) {
					selected_items[ctr.toString()] = cleanItem(check_group[i].value);
					ctr++;
				}
			}
			if(ctr > 0) return selected_items;
			else return false;
		}

		// Formats to '<amt>/<comment>' e.g. '45.34/transportation'
		function cleanItem(itemText) {
			// ... 
		}
     
3. When the items are received by the server, the [Concur SDK for nodejs](http://github.com/concur) calls the QuickExpense API for each item (e.g. 4 items = 4 QuickExpense API calls).  The corresponding items then show as expense in Concur:

		app.post('/expense', function(req, res) {
			var selected_items = req.body;

			var count = 0;
			var item_count = Object.keys(selected_items).length;

			// async module will call API in series...
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

### Support
If you have questions about this code, please email me at chris.ismael@concur.com 