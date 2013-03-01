(function(){

var geoWatchId
	, CurrentRaceId
	, Checkpoints
	, Map
	, RaceLine;

Meteor.subscribe('races');

Meteor.startup(function(){
	if(_.isUndefined(window.isMobile)){
		$('.mobileUI').remove();
		Map = new google.maps.Map(document.getElementById("map"), {
      		zoom: 14,
      		mapTypeId: google.maps.MapTypeId.ROADMAP,
      		center: new google.maps.LatLng(0, -180)
    	});

    	Map.addListener('tilesloaded', mapReady);
	}else{
		$('.desktopUI').remove();
	}
});

Template.controls.events({
	'click #startRace': function(){
		startRace();
	}
	, 'click #endRace': function(){
		stopRace();
	}
});

Template.desktopUI.races = function(){
	return Races.find({});
};

Template.desktopUI.events({
	'click a.recap': function(e){
		var race = Races.findOne({_id: $(e.currentTarget).data('race')});
		if(RaceLine){
			RaceLine.setMap(null);
		}
		console.log(race);
		var coordinates = _.reduce(race.checkpoints, function(memo, checkpoint){
			memo.push(new google.maps.LatLng(checkpoint.latitude, checkpoint.longitude));
			return memo;
		}, []);
		RaceLine = new google.maps.Polyline({
	    	path: coordinates,
	    	strokeColor: "#FF0000",
	    	strokeOpacity: 1.0,
	    	strokeWeight: 10
	  	});

	  	// calculate distance, crudely
	  	var previousCoordinate = coordinates[0];
	  	var distance = 0;
	  	for(var i = 1; i < coordinates.length; i++){
	  		var R = 6371; // km
			var dLat = toRad(coordinates[i].lat()-previousCoordinate.lat());
			var dLon = toRad(coordinates[i].lng()-previousCoordinate.lng());
			var lat1 = toRad(previousCoordinate.lat());
			var lat2 = toRad(coordinates[i].lat());

			var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
			        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(previousCoordinate.lat()) * Math.cos(coordinates[i].lat()); 
			var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
			distance += (R * c);
	  		previousCoordinate = coordinates[i];
	  	}

	  	// calculate time, crudely
	  	var time = race.checkpoints[race.checkpoints.length - 1].timestamp - race.checkpoints[0].timestamp;
	  	time /= 1000 * 60;

	  	$('.distance').html('Distance: ' + Math.round(distance) + ' miles');
	  	$('.time').html('Time: ' + Math.round(time) + ' minutes');
	  	$('.checkpoints').html('Checkpoints: ' + race.checkpoints.length);
	  	RaceLine.setMap(Map);
	  	console.log(coordinates);
	  	Map.setCenter(coordinates[0]);
	}
});

Template.controls.raceCount = function(){
	return Races.find({}).count();
};

function mapReady(){
	console.log('map ready');
}

function startRace(){
	$('#checkpoints').append('<li>Warm up lap...</li>');
	Races.insert({ owner: Meteor.userId() }, function(err, id){
		if(_.isUndefined(err)){
			$('#checkpoints').append('<li>Starting Race!</li>');
			CurrentRaceId = id;
			Checkpoints = [];
			startTracking();
		}else{
			console.log(err);
			$('#checkpoints').append('<li>Error Starting Race: '+err+'!</li>');
		}
	});
}

function startTracking(){
	var browserSupportFlag;
	// Try W3C Geolocation (Preferred)
	if(navigator.geolocation) {
		browserSupportFlag = true;
		geoWatchId = navigator.geolocation.watchPosition(function(position) {
			var checkpoint = {
				longitude: position.coords.longitude
				, latitude: position.coords.latitude
				, timestamp: new Date().getTime()
			}
			Checkpoints.push(checkpoint);
			$('#checkpoints').append('<li>'+checkpoint.latitude+', '+checkpoint.longitude+'</li>');
		}, function() {
			handleNoGeolocation(browserSupportFlag);
		});
	}
	// Browser doesn't support Geolocation
	else {
		browserSupportFlag = false;
		handleNoGeolocation(browserSupportFlag);
	}
	
	function handleNoGeolocation(errorFlag) {
		if (errorFlag == true) {
			alert("Geolocation service failed.");
		} else {
			alert("Your browser doesn't support geolocation. We've placed you in Siberia.");
		}
	}
}

function stopRace(){
	navigator.geolocation.clearWatch(geoWatchId); // stop tracking
	Races.update(CurrentRaceId, { $set: { checkpoints: Checkpoints } }, function(err){
		if(_.isUndefined(err)){
			$('#checkpoints').append('<li>race saved!</li>');
		}else{
			$('#checkpoints').append('<li>attempting to save race again in 15 seconds...</li>')
			setTimeout(function(){
				stopRace();
			}, 15000)
		}
	});
}

function toRad(degrees){
	return degrees * (Math.PI/180);
}

})();