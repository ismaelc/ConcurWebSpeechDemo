## Web Speech API (Chrome) to submit expense to Concur
This code demonstrates how to submit business expense with voice using the [Web Speech API](http://dvcs.w3.org/hg/speech-api/raw-file/tip/speechapi.html)  and the [Concur SDK](https://github.com/concur/concur-platform-sdk-js).  You can check out the demo video [here](https://www.youtube.com/watch?v=paCuZL-6drw)

<img src="https://jfqcza.bn1301.livefilestore.com/y2pL04qUEGxVy3xvmjgX8oGUfJxAaRQ3-onuryF7N7vxZehbsmE4_T9IEe7FqKlkEAnPBG6V4iT_FspUcKfaWGPXuPmbvtyo0S_XzRGh1z4eEdR_aX-5GbyqL34WYx8VoVQ/ConcurWebSpeechDiagram.PNG?psid=1" width="800px" />

The diagram above describes the flow of the demo, and the file/code where each logic is located.  The Code section below will explain how this all works. This code uses the HTML5 Audio API (use Chrome) to record voice, and node.js to drive the backend (primarily to accept client calls and call out web APIs). 

### Configuration
You would need to sign up a Concur developer sandbox account and generate an access token:

- [Concur Developer Sign-up page](https://developer.concur.com/register) - QuickExpense API to submit expense amount to Concur
- [Generate Concur Developer access token](https://developer.concur.com/oauth-20/native-flow)
- [Video on how to generate Concur access token](https://www.youtube.com/watch?v=Cy2rPV_I03w)

Once you have your access token, you can plug it in at `config.js` like below:

    config.concur.accessToken = "<insert Concur access token here>";

### Code
Please refer to the diagram at the top of this README to follow the code explanation below:

1. Tap the microphone icon on the app to start recording voice. Tap it again to end recording.
2. Capture voice into blob.  The function below will already hold the audio `blob`, ready to be sent Firebase
             
        function doneEncoding( blob ) {
	      // sendVoiceToNode called in concuratt.js
	      sendVoiceToNode(blob);
          Recorder.setupDownload( blob, "myRecording" + ((recIndex<10)?"0":"") + recIndex + ".wav" );
          recIndex++;
        }
3. Trigger server to wait; Send B64'd blob to Firebase

        // set up POST call as trigger to wait for Firebase to receive the B64 voice/binary file
	    var xhr = new XMLHttpRequest();
	    xhr.open("POST", '/receiveVoice', true);
	    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

	    // send the call to trigger server into wait mode
	    xhr.send(JSON.stringify(data));

	    // ... and send B64'd blob to Firebase
	    sendToFirebase(blob, id);
4. Receive Base-64'd  blob from Firebase

        // receive B64'd blob from Firebase
        myVoiceRootRef.on('child_added', function(snapshot) {
	         if (!newVoiceItems) return; // Keep from loading entire list

	         var fbaseObj = snapshot.val();

	         var b64string = fbaseObj.voiceBlobBase64;
	         var buf = new Buffer(b64string, 'base64');
	         
	         ...
	    })
	    
5. Call AT&T Speech API on voice blob

	    // set up call to AT&T Speech Recognition on blob turned to buffer
	    var headers = {
		   'Content-Type': 'audio/wav',
		   'Authorization': 'Bearer ' + config.att.accessToken,
		   'Accept' : 'application/json'
	    };

	    var options = {
		   host: 'api.att.com',
		   path: '/speech/v3/speechToText',
		   method: 'POST',
		   headers: headers
        };

 	    // Setup the request.
	    var req = https.request(options, function (res) {
		   res.setEncoding('utf-8');

		   var responseString = '';

		   res.on('data', function (data) {
			   responseString += data;
		   });

		   res.on('end', function () {
			   console.log("Response: " + responseString);
			   ...
		    });
		});
		
	    req.on('error', function (e) {
		   // TODO: handle error.
		   console.log(e);
	    });

	    // make the request to AT&T Speech Recognition API
	    req.write(buf);
	    req.end();		
6. Send expense to Concur through QuickExpense API using the [Concur SDK](https://github.com/concur/concur-platform-sdk-js)
       
        // Upon confirmation from user, send amount to Concur
        app.post('/receiveExpense', function(req, res) {

	      var amount = req.body.amount;

          var now = new Date();
          var year = now.getFullYear();
	      var month = now.getMonth();
	      var date = now.getDate();

	      var fullDate = year + '-' + (month +1) + '-' + date;

	      var concurBody = {
		    "CurrencyCode": "USD",
		    "TransactionAmount": amount,
		    "TransactionDate": fullDate
	      }

	      var options = {
		    oauthToken: config.concur.accessToken,
		    contentType:'application/json',
		    body:concurBody
	      }

	      concur.quickexpenses.send(options)
	       .then(function(data){
		      //Contains the ID and URI to the resource
		      console.log("QuickExpense created! " + amount);
		      res.send("QuickExpense created! " + amount);
	       })
	       .fail(function (error) {
		      //Error contains the error returned
		      console.log(error);
	       });
        });

### Support
If you have questions about this code, please email me at chris.ismael@concur.com 