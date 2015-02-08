// This hash exists to map from normal crime names to our internal representations
var possibleCrimes = {
    "Primary Crime"      : "primaryCrime",
    "Secondary Crime"    : "secondaryCrime",
    "Aggravated Assault" : "AggAssault",
    "Arson"              : "Arson",
    "AutoTheft"          : "AutoTheft",
    "Burglary"           : "Burglary",
    "Homicide"           : "Homicide",
    "Larceny"            : "Larceny",
    "Rape"               : "Rape",
    "Robbery"            : "Robbery",
    "Total"              : "Total",
};
// These exist for easy filtering with _.omit
var crimeFilter = ['NEIGHBORHOOD', 'Total', 'primaryCrime', 'secondaryCrime', 'Primary Crime', 'Secondary Crime'];
var selectedCrimeType = 'primaryCrime';
var crimeScales = {};
var crimehash = {};
var crimeRanges = {};

_.chain(possibleCrimes).omit(["Primary Crime","Secondary Crime"]).values().each(function(value){
    crimeRanges[value]=[]
});

function generateScales(name, min, max) {
    crimeScales[name] = d3.scale.linear().domain([min,max]).range([1,0]);
}

// XXX: d.csv is async, so putting this at the top of the file is only hoping
// that the data is smallest enough that the data will be available once the dom is available.
// A better method should be found, I think, to ensure that the crime data is available before the map
// since it's being used for the fill color for the neighborhoods
// Honestly we could probably put the jquery call to buld the map at the end of parseCrimeData
function parseCrimeData(error, data) {
    'use strict';
    if (error) {return console.error(error);}

    data.forEach(function(dataObj){
        _.each(_.keys(_.omit(dataObj, 'NEIGHBORHOOD')), function(key){
            // Turn the crime count into an int
            dataObj[key] = +dataObj[key];

            // Swap these lines if you want DTW to be left out of the crime ranges
            // This is pretty heavy handed outlier handling and we should probably find a better solution
            // We should contemplate what "outlier" means in the context of the goal of this project.
            // We could easily just chuck the top three numbers for the ranges...
            // We could also just have the top three hoods be black,
            // but even that is kind of heavy handed
            //if (key !== 'Primary Crime' && dataObj.NEIGHBORHOOD !== 'DOWNTOWN WEST'){
            if (key !== 'Primary Crime' && key !== 'Secondary Crime'){
                crimeRanges[key].push(dataObj[key]);
            }
            // Find the crime with the highest count
            if ( key !== "Total" ) {
                if (dataObj[key] > (dataObj[dataObj.primaryCrime] || -Infinity)) {
                    dataObj.primaryCrime = key;
                }
            }
        });

        _.each(_.keys(_.omit(dataObj, crimeFilter.concat(dataObj.primaryCrime))), function(key) {
            //Find the crime with the second highest count
            if (dataObj[key] > (dataObj[dataObj.secondaryCrime] || -Infinity)) {
                dataObj.secondaryCrime = key;
            }
        });
        // Store the crime data in a hash table for easy retrieval later
        crimehash[dataObj.NEIGHBORHOOD]=dataObj;

    });

    // Convert the ranges into holding the max and the min
    _.chain(crimeRanges).each(function(value, key){
        crimeRanges[key] = { 'min': _.min(value), 'max': _.max(value)};
    });

    // Generate the scales for each crime type
    _.each(crimeRanges, function(value, key){generateScales(key, value.min, value.max)});
}
// This data file is currently only for minneapolis
d3.csv("data/ytd_sep_2014.csv", function(error, data) {parseCrimeData(error, data)});

// Set the luminosity of 'color' to 0.5 for accurate representation
function normalizeColors(color) {
    var hslcolor = d3.hsl(color);
    return d3.hsl(hslcolor.h, hslcolor.s, 0.5);
}

// Get an array of HSL colors with half luminosity
var colors = d3.scale.category10().range().map(normalizeColors);

// Returns the stats associated with a particular hood and crime type, or
// Returns the primary crime type is 'crimeType' == 'primaryCrime'
function getCrimeDetails(name, crimeType) {
    return crimehash[name.toUpperCase()][crimeType];
}

// This exists because we store the primary crime type inside the hoods crime hash with
// the key 'primaryCrime' and the value is the primary crime as a string.
// Once we start coloring the hoods based on a particular crime, we need a way to pull
// the primary crime out from the hash if we're showing the primary crime. To cleanup
// other code I've written this function
function getDesiredCrimeName(name, crimeType) {
    return ( crimeType == 'primaryCrime' || crimeType == 'secondaryCrime') ?
        getCrimeDetails(name, crimeType) :
        crimeType;
}

// Scale the color based on the relative amount of a particular crime in this neighborhood
function scaleColor(crimetype, color, name){
    if (selectedCrimeType == 'primaryCrime' || selectedCrimeType == 'secondaryCrime') {
        return color;
    }
    var scale = crimeScales[crimetype],
        crimeNum = getCrimeDetails(name, crimetype);

    return d3.hsl(color.h, color.s, scale(crimeNum));
}

// Retrieve the HSL color object based on the short form for the crime type
function getColor(crimetype) {
    return crimetype == "Homicide"   ? colors[0] :
        crimetype == "Rape"       ? colors[1] :
        crimetype == "Robbery"    ? colors[2] :
        crimetype == "AggAssault" ? colors[3] :
        crimetype == "Burglary"   ? colors[4] :
        crimetype == "Larceny"    ? colors[5] :
        crimetype == "AutoTheft"  ? colors[6] :
        crimetype == "Arson"      ? colors[7] :
        colors[8];
}

// Get the color object and scale it based on the relative amount of crime for that hood
function getAndScaleColor(crimetype, name) {
    return scaleColor(crimetype, getColor(crimetype), name);
}

// Since the primary crime type is brown, grey dashes don't look that great, so use white instead
// This function isn't that useful if the primary crime type stops being brown
function getDashColors() {
    return selectedCrimeType == 'primaryCrime' ? 'white' : 'grey'
}

// Define the style for the neighborhood objects
function style(feature) {
    var neighborhood = feature.properties.name;
    var crimename = getDesiredCrimeName(neighborhood, selectedCrimeType);
    return {
        fillColor: getAndScaleColor(crimename, neighborhood),
        weight: 2,
        opacity: 1,
        color: getDashColors(),
        dashArray: '3',
        fillOpacity: 0.7
    };
}

// data should be of the form { <crime_name> : { max : <int>, min : <int> }, ...}
// I actually need to stack the colors with the data
function createDataSets(crimeranges) {
    var datasets = [],
        fillcolors = [],
        highlightFillcolors = ["black", "red", "yellow", "green",
                                "blue", "orange", "gainsboro", "LawnGreen"],
        strokecolors = [],
        highlightStrokecolors = _.shuffle(highlightFillcolors),
        crimestats = [];
    // Filter out meta-crimes
    crimeranges = _.omit(crimeranges,crimeFilter);

    _.each(crimeranges, function(value, key, list){
            fillcolors.push(getColor(key));
            crimestats.push(value.max);
        });
    strokecolors = _.shuffle(fillcolors);

    datasets.push({
        fillColor: fillcolors,
        strokeColor: strokecolors,
        highlightFill: highlightFillcolors,
        highlightStroke: highlightStrokecolors,
        data: crimestats,
    })
    return datasets;
}

// This should be passed a data object, I suppose
// XXX: Maybe this should show the totals for the city when no neighborhood is clicked?
function createCharts(minmaxdata) {
    // Make sure new charts are responsive
    Chart.defaults.global.responsive = true;
    //Chart.defaults.Bar.barShowStroke = false;
    var bcContext = document.getElementById("barchart").getContext("2d"),
        lcContext = document.getElementById("linechart").getContext("2d"),
        months = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"],
        crimes = _.keys(_.omit(possibleCrimes, crimeFilter));

    var barData = {
        labels: crimes,
        datasets: createDataSets(minmaxdata)
    }

    window.barChart = new Chart(bcContext).Bar(barData);
    //window.lineChart = new Chart(lcContext).Line(lineData, options);

}

function createMap() {
    var map = L.map('map').setView([44.973333, -93.266667], 12);
    var info = L.control();
    var crimeSelecter = L.control();
    var topoLayer = new L.TopoJSON('', {
        style: style,
        onEachFeature: onEachFeature
    });

    // This is kind of busy, but OSM is cool and I like the map otherwise
    // http://{s}.tile.osm.org/{z}/{x}/{y}.png
    // This looks like it was printed dot-matrix style
    // http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png
    // This b/w tile set is pretty nice and should give context
    // https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png
    // XXX: If you don't have an internet connection, comment this block and reload
    L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution:
            'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
            '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="http://mapbox.com">Mapbox</a>',
            id: 'examples.map-20v6611k'
            }).addTo(map);

    function chooseDashColor(name) {
        if (!info.clickedHood) {
            return '#666'; // just hovering
        } else if (info.clickedHood == name) { // if we've clicked and are over the click
            return 'black'
        } else { // we've clicked and aren't over the click
            return 'blue';
        }
    }

    function highlightFeature(e) {
        var layer = e.target,
            name = layer.feature.properties.name;

        layer.setStyle({
            weight: 5,
            color: chooseDashColor(name),
            dashArray: '',
            fillOpacity: 0.7
        });

        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
            if (info.clickedLayer)
                info.clickedLayer.bringToFront();
        }
        // XXX this need to be moved out of highlightFeature
        info.update(layer.feature.properties);
    }

    function setHoverDetails(e) {
        var layer = e.target;
        highlightFeature(e);
        info.update(e.target.feature.properties);
    }

    function resetHoverDetails(e) {
        resetHighlight(e.target);
        info.update();
    }

    function resetHighlight(target) {
        if (info.clickedHood !== target.feature.properties.name)
            topoLayer.resetStyle(target);
    }

    // Save which neighborhood we clicked so we can do comparisons with moused over hoods
    // This function should only be called on click for neighborhoods
    function updateDOD(e) {
        info.clickedHood = e.target.feature.properties.name;
        if (info.clickedLayer)
            resetHighlight(info.clickedLayer);
        info.clickedLayer = e.target;
        highlightFeature(e);
        info.update();
    }

    // Unset the clicked hood, since we have clicked the map
    // This is called on map click, including double click and crime selection
    function resetDOD() {
        info.clickedHood = '';
        if (info.clickedLayer)
            resetHighlight(info.clickedLayer);
        info.clickedLayer = '';
        info.update();
    }

    map.on('click', resetDOD);

    function onEachFeature(feature, layer) {
        //layer.bindPopup(feature.properties.description);
        layer.on({
            mouseover: setHoverDetails,
            mouseout: resetHoverDetails,
            click: updateDOD
        });
    }

    // method that we will use to update the control based on feature properties passed
    info.update = function (props) {
        var hoodInfo = 'Click or hover over a neighborhood';
        // First generate the html for the hood we've clicked, if we've clicked,
        // so we can compare against other hoods
        // the items between ';;' pairs are for later replacement when we're hovering over a hood
        // They are cleaned out of hoodInfo before we set the innerHTML
        if (this.clickedHood) {
            hoodInfo = '<b><center>' + this.clickedHood + '</center></b></br>;;hoodname;;';
            hoodInfo = hoodInfo + '<div id=crimeInfo>';
            Object.keys(possibleCrimes).forEach(function(crime) {
                var crimeType = possibleCrimes[crime],
                    crimeDetails = getCrimeDetails(this.clickedHood, crimeType);
                hoodInfo = hoodInfo + '<span class=crimename>' +crime +'</span>: <span class=crimedets>'
                    + crimeDetails + ';;hover' + crime + ';;</span></br>';
            }, this);
            hoodInfo = hoodInfo + '</div>';
        }
        // Mix in the details for the hood we're hovering over
        if (props) {
            var name = props.name;
            // We haven't clicked on a hood so make the info from scratch
            // This shares almost exactly the code from above, but I haven't figured out how to
            // factor this out yet
            if (!this.clickedHood){
                hoodInfo = '<b><center>' + name + '</center></b></br>';
                Object.keys(possibleCrimes).forEach(function(crime) {
                    var crimeType = possibleCrimes[crime],
                        crimeDetails = getCrimeDetails(name, crimeType);
                    hoodInfo = hoodInfo + '<span class=crimename>' + crime +'</span>: <span class=crimedets>'
                        + crimeDetails + '</span></br>';
                }, this);
            } else if (this.clickedHood !== name) {
                hoodInfo = hoodInfo.replace(';;hoodname;;',
                        '<div id=shName class=scndhd>'+name+'</div></br>');
                Object.keys(possibleCrimes).forEach(function(crime) {
                    var crimeType = possibleCrimes[crime],
                        crimeDetails = getCrimeDetails(name, crimeType);
                    hoodInfo = hoodInfo.replace(';;hover'+crime+';;',
                            ' <span class=scndhd>'+crimeDetails+'</span>');
                }, this);
            }
        }
        // Make sure the placeholder is gone if we're not hovering over a hood
        var placeholderReg = /;;.*?;;/g;
        hoodInfo = hoodInfo.replace(placeholderReg,'');
        this._div.innerHTML = hoodInfo;
    };

    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
        this.update();
        return this._div;
    };

    info.addTo(map);

    crimeSelecter.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'crimeSelecter');
        return this._div;
    };
    crimeSelecter.addTo(map);
    Object.keys(possibleCrimes).forEach(function(crime) {
        $('<input type="radio" id="' + crime
                + '" name=crimetypes /> '+crime+'</br>').appendTo('.crimeSelecter');
    });
    $( "input" ).on( "click", function() {
        selectedCrimeType = possibleCrimes[$( "input:checked")[0].id];
        topoLayer.eachLayer(function(l){topoLayer.resetStyle(l)});
    });

    function addTopoData(topoData){  
        topoLayer.addData(topoData);
        topoLayer.addTo(map);
    }

    $.getJSON('mpls.nbhoods.json')
        .done(addTopoData);

    // Create the initial chart with an overview
    createCharts(crimeRanges);
}
// Make sure that the DOM is available, then do map related stuff
$( document ).ready(createMap);

// vim: et ts=4 sw=4
