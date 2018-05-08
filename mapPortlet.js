var exportedMap;

var init = function() {

    var layerID=0;
    var rectangleCounter = 0;
    var circleCoordinateEndDraw; // passing of raw coordinates for features on adding a shape
    var MAX_LATITUDE_LIMIT=85;
    var MAX_LATITUDE_AREA_LIMIT=85.2;
    var MIN_LATITUDE_LIMIT=-85;
    var MIN_LATITUDE_AREA_LIMIT=-85.2;
    var MAX_AREA_SQ_KM=1000000;
    var PopUpType = {
        INVALID_COORDINATES: "#invalid_coordinates",
        NO_POLYGON_DEFINED: "#kml_import_error1",
        WRONG_COORDINATES: "#kml_import_error2",
        WARN_BIG_AREA: "#big_area"
    //		  KML_SUCCESS: "#kml_import_succes",
    //		  KML_ERROR: "#kml_import_error",
    //		  INVALID_EXTENSION: "#kml_import_wrong",
    };
    var map;

    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for(var i = 0; i < 6; i++ ) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
        return parseInt(result[1], 16) + ', ' + parseInt(result[2], 16) + ', ' + parseInt(result[3], 16);
    }

    function getLayerList(mapWithLayers){
        return mapWithLayers.getLayers().getArray();
    }
    function fitMapToExtent() {
        var polygonLayersExtent = ol.extent.createEmpty();
        var valid = true;
        var mapLayers = getLayerList(map);


        for(var i = 0; i < mapLayers.length; i++){
            if(mapLayers[i] instanceof ol.layer.Vector && mapLayers[i].values_.visible){
                ol.extent.extend(polygonLayersExtent, mapLayers[i].getSource().getExtent());
            }
        }
        for(var j = 0; j < polygonLayersExtent.length; j++){
            if(!isFinite(polygonLayersExtent[j])){
                valid = false;
                break;
            }
        }
        if(valid === true){
            // alert("mapsize:"+map.getSize());
            if(map.getSize()!== undefined) {
                map.getView().fit(polygonLayersExtent, map.getSize());
            }
        }
        else{
            map.getView().setCenter(ol.proj.transform([22.867622, 52.413554], 'EPSG:4326', 'EPSG:3857'));
            map.getView().setZoom(3);
        }
    }
    function latLonCoordinatesFormat(){
        return (
            function(coord1) {
                var long = longitudeModulo(coord1[0]);
                var dms = decimalToDms(coord1[1], long);

                return dms[0][0] + "°" +dms[0][1] + "\'" +dms[0][2] + "." +dms[0][3]+"\""+dms[0][4]+" "+dms[1][0] + "°" +dms[1][1] + "\'" +dms[1][2] + "." +dms[1][3]+"\""+dms[1][4];

            });
    };

    function increseRectangleCounter(){
        rectangleCounter = 1;
        $("#map_controls #rectangle").addClass('disabled');
        $("#map_controls #rectangle").removeClass('active');
        $("#rectangle_opt").attr('disabled', 'true');
        removeInstruction();
        removeInteraction('draw');
        removeInteraction('select');
        removeInteraction('modify');
    }
    function decreseRectangleCounter(){
        rectangleCounter = 0;
        $("#map_controls #rectangle").removeClass('disabled');
        $("#rectangle_opt").removeAttr('disabled');
    }

    function getNewLayerId(){
        return layerID++;
    }
    var draw;
    var select;
    var modifyRectangleInteraction, modifyPolygonInteraction, modifyCircleInteraction;

    var wgs84Sphere = new ol.Sphere(6378137);

    var features = new ol.Collection();

    $(document).on('mousemove', function(e){
        if($('#map_place:hover').length > 0){
            $('#mouse_position').css('display', 'block');
            $('#mouse_position').css({
                left:  e.pageX + 30,
                top:   e.pageY + 30
            });
        }
        else{
            $('#mouse_position').css('display', 'none');
        }
    });
    /*
     * removes the empty square box on scroll
     * */
    $(document).on('mouseout', function(){
        if($('#map_place:hover').length > 0){
            $('#mouse_position').css('display', 'none');
        }
    });

    var normalStyle = new ol.style.Style({
        name: 'normalStyle',
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.3)'
        }),
        stroke: new ol.style.Stroke({
            color: '#C74722',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#C74722'
            })
        })
    });

    var blockedStyle = new ol.style.Style({
        name: 'normalStyle',
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.3)'
        }),
        stroke: new ol.style.Stroke({
            color: '#595959',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#595959'
            })
        })
    });

    var drawStyle = new ol.style.Style({
        name: 'normalStyle',
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.5)'
        }),
        stroke: new ol.style.Stroke({
            color: '#C74722',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({
                color: '#C74722'
            })
        })
    });

    var activeStyle = new ol.style.Style({
        name: 'activeStyle',
        fill: new ol.style.Fill({
            color: 'rgba(12, 153, 253, 0.5)'
        }),
        stroke: new ol.style.Stroke({
            color: '#0C99FD',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#0C99FD'
            })
        })
    });

    function createNamedStyle(color, text) { // color, ex. '255, 255, 255'
        return new ol.style.Style({
          name: 'namedStyle',
          fill: new ol.style.Fill({
            color: 'rgba(' + color + ', 0.4)'
          }),
          stroke: new ol.style.Stroke({
            color: 'rgb(' + color + ')',
            width: 2
          }),
          image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
              color: 'rgb(' + color + ')'
            })
          }),
          text: new ol.style.Text({
            font: '14px Notes ESA Bold, sans-serif',
            text: text,
            fill: new ol.style.Fill({
              color: '#fff'
            }),
            stroke: new ol.style.Stroke({
              color: '#000',
              width: 2
            })
          })
        });
    }

    function updateMapValidation(root) {

        $(root).validate();

        root.find(".valid-map-name").each(function() { $(this).rules('add', {
            maxlength: 70,
            mapname: true,
            required: true
        })});

        root.find(".valid-map-pri").each(function() { $(this).rules('add', {
            range: [1, 100],
            required: true,
            messages: { range: window.validationMsgs['mapPriority'] }
        })});

        root.find(".valid-map-poly").each(function() { $(this).rules('add', {
            polydms: true,
            required: true,
            polydec: true,
            messages: {
                polydms: window.validationMsgs['mapPolyDms'],
                polydec: window.validationMsgs['mapPolyDec']
            }
        })});

        root.find(".valid-map-lat").each(function() { $(this).rules('add', {
            latdms: true,
            latdec: true,
            required: true
        })});

        root.find(".valid-map-lon").each(function() { $(this).rules('add', {
            londms: true,
            londec: true,
            required: true
        })});

        root.find(".valid-map-radius").each(function() { $(this).rules('add', {
            minradius: true,
            required: true
        })});

        // updateValidation(root);
        // callWithNotIgnoredHidden(function() {
        // 	$('#select_shape').valid();
        // });
    }

    // make those functions globally accesible
    module.exports.addRectangleBlocked = addRectangleBlocked;
    module.exports.addCircleBlocked = addCircleBlocked;
    module.exports.addPolygoBlocked = addPolygoBlocked;
    module.exports.addCircleNamed = addCircleNamed;
    module.exports.addPolygonNamed = addPolygonNamed;
    module.exports.addRectangleNamed = addRectangleNamed;
    module.exports.showThoseLayers = showThoseLayers;
    module.exports.showAllLayers = showAllLayers;
    module.exports.retrieveAndCheckCoordinatesData = retrieveAndCheckCoordinatesData;
    window.addPolygonShapeAndForm = addPolygonShapeAndForm;
    window.addRectangleShapeAndForm = addRectangleShapeAndForm;
    window.addCircleShapeAndForm = addCircleShapeAndForm;
    window.fitMapToExtent = fitMapToExtent;

    mousePositionControl = new ol.control.MousePosition({
        coordinateFormat: latLonCoordinatesFormat(),
        projection: 'EPSG:4326',
        className: 'custom-mouse-position',
        target: document.getElementById('mouse_coordinates'),
        undefinedHTML: '&nbsp;'
    });

    //map
    var editControl = $("#edit");
    var rectControl = $("#rectangle");
    var polyControl = $("#polygon");
    var circControl = $("#centerPoint");

    var controls = [editControl, rectControl, polyControl, circControl];

    var gmap = null;

    var view = new ol.View({
        maxZoom: 13
    });

    if(typeof google !== 'undefined') {
        var gmap = null;
        if(document.getElementById('map_place_gm') !== null) {
            gmap = new google.maps.Map(document.getElementById('map_place_gm'), {
                disableDefaultUI: true,
                keyboardShortcuts: false,
                draggable: false,
                disableDoubleClickZoom: true,
                scrollwheel: false,
                streetViewControl: false
            });
        }
        view.on('change:center', function() {
            var center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
            if(gmap !== null) { gmap.setCenter(new google.maps.LatLng(center[1], center[0])); }
        });

        view.on('change:resolution', function() {
            if(gmap !== null) { gmap.setZoom(view.getZoom()); }
        });
    }

    var bingMap = new ol.layer.Tile({
        visible: false,
        mapLayer: true,
        preload: Infinity,
        source: new ol.source.BingMaps({
            key: 'AmA1xhQNkE9DwDH1GZBe62xfN7bSWQK5ZRsdbH9Zkasxhdk1kTfIp4oi2wvDP5ww',
            imagerySet: 'AerialWithLabels'
        })
    });

    var osm = new ol.layer.Tile({
        source: new ol.source.OSM({
        }),
        visible: false,
        mapLayer: true
    });
    var layers = [bingMap, osm];

    var olMapDiv = document.getElementById('map_place');

    map = new ol.Map({
        controls: ol.control.defaults({
            attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
                collapsible: false
            })
        }).extend([
            mousePositionControl
        ]),
        interactions: ol.interaction.defaults({
            altShiftDragRotate: false,
            dragPan: false,
            mouseWheelZoom:false,
            rotate: false
        }).extend([new ol.interaction.DragPan({kinetic: null})]),
        layers: layers,
        target: olMapDiv,
        view: view
    });

    fitMapToExtent();

    if(gmap !== null){
        olMapDiv.parentNode.removeChild(olMapDiv);
        gmap.controls[google.maps.ControlPosition.TOP_LEFT].push(olMapDiv);
    }
    else{
        $('.controlMap').each(function(){
            $(this).removeClass('active');
        });
        $("#google_maps").addClass("disabled");
        changeMapToBing();
    }
    select = new ol.interaction.Select({
        wrapX: true,
        style: activeStyle,
        filter: function(feature) {
            if(typeof feature.get('isBlocked') === 'undefined'){
                return true;
            }
            return !feature.get('isBlocked');
        }
    });

    modifyPolygonInteraction = new ol.interaction.Modify({
        features: select.getFeatures()
    });

    modifyRectangleInteraction = new ol.interaction.ModifyRectangle({
        features: select.getFeatures()
    });

    modifyCircleInteraction = new ol.interaction.ModifyCircle({
        features: select.getFeatures()
    });

    select.on('select', function(e) {
        clearLayerSelection();
        $("#map_layers .map_layers_layer").each(function(){
            $(this).removeClass('active');
        });
        removeInteraction('modify');
        if(e.selected.length > 0){

            e.selected[0].setStyle();
            var id = e.selected[0].get("id");
            $("#map_layers [layer_id='"+id+"']").addClass('active');

            if(e.selected[0].getGeometry() instanceof ol.geom.Polygon){
                map.addInteraction(modifyPolygonInteraction);
            }
            else if(e.selected[0].getGeometry() instanceof ol.geom.MultiPolygon){
                map.addInteraction(modifyRectangleInteraction);
            }
            else if(e.selected[0].getGeometry() instanceof ol.geom.Circle){
                map.addInteraction(modifyCircleInteraction);
            } else {
                // had to add because it is CRITICAL issue
            }
        }

    });
    modifyPolygonInteraction.on('modifyend', function(e) {
        if($('#decimal_radio:checked').length ===0){
            $('#decimal_radio').prop("checked", true).trigger("change");
        }

        var coordinates = e.features.getArray()[0].getGeometry().getFlatCoordinates();
        var name = e.features.getArray()[0].get('name');
        var priority = e.features.getArray()[0].get('priority');
        var shape = e.features.getArray()[0].get('shape');
        var id = e.features.getArray()[0].get('id');

        modifyPolyForm(priority, name, shape+"_"+id, coordinates);
    });

    modifyRectangleInteraction.on('modifyend', function(e) {
        if($('#decimal_radio:checked').length ===0){
            $('#decimal_radio').prop("checked", true).trigger("change");
        }
        var coordinates = e.features.getArray()[0].getGeometry().getPolygon(0).getFlatCoordinates();
        var name = e.features.getArray()[0].get('name');
        var priority = e.features.getArray()[0].get('priority');
        var shape = e.features.getArray()[0].get('shape');
        var id = e.features.getArray()[0].get('id');

        modifyRectForm(priority, name, shape+"_"+id, [coordinates[0], coordinates[1]], [coordinates[4], coordinates[5]]);
    });
    var modifyStarted = false;
    modifyCircleInteraction.on('modifystart', function(e) {
        if(modifyStarted !== true){
            showRadius();
            addInstruction('centerPoint', false);
        }
        modifyStarted = true;

        var flatCoords = e.features.getArray()[0].getGeometry().getFlatCoordinates();
        var radiusInKm = getDistanceInKmOnSameLatitude([flatCoords[0], flatCoords[1]],[flatCoords[2], flatCoords[3]]);
        var roundRadiusInKm = Math.ceil(radiusInKm);
        refreshRadiusValue(roundRadiusInKm);
    });
    modifyCircleInteraction.on('modifyend', function(e) {
        hideRadius();
        removeInstruction();
        modifyStarted = false;
        if($('#decimal_radio:checked').length ===0){
            $('#decimal_radio').prop("checked", true).trigger("change");
        }

        var coordinates = e.features.getArray()[0].getGeometry().getFlatCoordinates();
        var name = e.features.getArray()[0].get('name');
        var priority = e.features.getArray()[0].get('priority');
        var shape = e.features.getArray()[0].get('shape');
        var id = e.features.getArray()[0].get('id');
        modifyCircleForm(priority, name, shape+"_"+id, [coordinates[0], coordinates[1]], [coordinates[2], coordinates[3]]);
    });
    var selected_features = select.getFeatures();

    selected_features.on('add', function(evt) {
        var feature = evt.element;
        feature.setStyle(activeStyle);
        if(feature.getGeometry() instanceof ol.geom.Polygon){
            map.addInteraction(modifyPolygonInteraction);
        }
        else if(feature.getGeometry() instanceof ol.geom.MultiPolygon){
            map.addInteraction(modifyRectangleInteraction);
        }
        else if(feature.getGeometry() instanceof ol.geom.Circle){
            map.addInteraction(modifyCircleInteraction);
        } else {
            // had to add because it is CRITICAL issue
        }

    });

    selected_features.on('remove', function(evt) {
        var feature = evt.element;
        feature.setStyle(normalStyle);
        removeInteraction('modify');
    });

    var calculateRadius = function(center, end){
        var a = Math.abs(center[0] - end[0]);
        var b = Math.abs(center[1] - end[1]);
        var radius = Math.sqrt(a*a + b*b);
        return radius;
    };
    window.calculateRadius = calculateRadius;

    function addInteraction(action) {
        if (action !== "") {
            var geometryFunction, maxPoints;
            var value = '';

            if (action === 'edit') {
                map.addInteraction(select);
            }
            else{
                if (action === 'rectangle' && rectangleCounter < 1) {
                    value = 'LineString';
                    maxPoints = 2;
                    geometryFunction = function(coordinates, geometry) {
                        if (!geometry) {
                            geometry = new ol.geom.MultiPolygon(null);
                        }
                        var start = coordinates[0];
                        var end = coordinates[1];
                        var coordinates = [[[start, [start[0], end[1]], end, [end[0], start[1]], start]]];
                        geometry.setCoordinates(coordinates);
                        return geometry;
                    };
                    draw = new ol.interaction.Draw({
                        features: features,
                        type: (value),
                        geometryFunction: geometryFunction,
                        maxPoints: maxPoints,
                        style: drawStyle
                    });
                    draw.on('drawstart', function() {
                        addInstruction(action, false);
                    });
                    draw.on('drawend', function() {
                        addInstruction(action, true);
                    });
                }
                else if(action === 'polygon'){
                    value = "Polygon";
                    var onTimeTwoPoints = true;
                    geometryFunction = function(coordinates, geometry) {
                        if (!geometry) {
                            geometry = new ol.geom.Polygon(null);
                        }
                        if(typeof coordinates !== 'undefined' && coordinates.length > 0 && coordinates[0].length === 4 && onTimeTwoPoints){
                            addInstruction(action, false);
                            onTimeTwoPoints = false;
                        }
                        geometry.setCoordinates(coordinates);
                        return geometry;
                    };
                    draw = new ol.interaction.Draw({
                        features: features,
                        type: (value),
                        geometryFunction: geometryFunction,
                        style: drawStyle
                    });
                    draw.on('drawend', function() {
                        addInstruction(action, true);
                        onTimeTwoPoints = true;
                    });
                }
                else if(action === 'centerPoint'){
                    var coords;
                    value = "Circle";
                    geometryFunction = function(coordinates, geometry) {
                        if (!geometry) {
                            geometry = new ol.geom.Circle(null, null, null);
                        }
                        var radius = calculateRadius(coordinates[0], coordinates[1]);
                        coords=coordinates;
                        geometry.setFlatCoordinates(geometry.getLayout(), coordinates);
                        geometry.setCenter(coordinates[0]);
                        geometry.setRadius(radius);

                        var flatCoords = geometry.getFlatCoordinates();
                        var radiusInKm = getDistanceInKmOnSameLatitude([flatCoords[0], flatCoords[1]],[flatCoords[2], flatCoords[3]]);
                        var roundRadiusInKm = Math.ceil(radiusInKm);
                        refreshRadiusValue(roundRadiusInKm);
                        if(radiusInKm < 3){
                            refreshRadiusValue(3);
                            geometry.setCenter(coordinates[0]);
                            geometry.setRadius(getRadius(ol.proj.transform(coordinates[0], 'EPSG:3857', 'EPSG:4326'), 3));
                        }
                        return geometry;
                    };

                    draw = new ol.interaction.Draw({
                        features: features,
                        type: (value),
                        geometryFunction: geometryFunction,
                        style: drawStyle
                    });

                    draw.on('drawstart', function() {
                        addInstruction(action, false);
                        showRadius();
                    });

                    draw.on('drawend', function() {
                        addInstruction(action, true);
                        hideRadius();
                        circleCoordinateEndDraw = coords;
                    });

                } else {
                    // had to add because it is CRITICAL issue
                }
                map.addInteraction(draw);
            }
        }
    }

    $('.control').click(function(){
        var actionToDo = "";
        if(!$(this).hasClass("disabled")){
            if($(this).attr("id") === "map_controls2"){
                fitMapToExtent();
            }
            else{
                clearLayerSelection();
                removeInteraction('draw');
                removeInteraction('select');
                removeInteraction('modify');
                if($(this).hasClass('active')){
                    $(this).removeClass('active');
                    removeInstruction();
                }
                else{
                    $(controls).each(function(){
                        $(this).removeClass('active');
                    });
                    $(this).addClass('active');
                    actionToDo = $(this).attr("id");

                    addInteraction(actionToDo);
                    addInstruction(actionToDo, true);

                }
            }
        }
    });

    $('.controlMap').click(function(){
        if(!$(this).hasClass('active') && !$(this).hasClass('disabled')){
            $('.controlMap').each(function(){
                $(this).removeClass('active');
            });
            if($(this).attr('id') === "google_maps"){
                $(this).addClass('active');
                changeMapToGoogleMaps();
            }
            else if($(this).attr('id') === "bing"){
                $(this).addClass('active');
                changeMapToBing();
            }
            else if($(this).attr('id') === "osm"){
                $(this).addClass('active');
                changeMapToOsm();
            } else {
                // had to add because it is CRITICAL issue
            }
        }

    });

    // on adding a shape
    features.on('add', function(){
        var newLayerId = getNewLayerId();
        var newFeature = features.getArray()[features.getLength()-1];
        var shapename = getActiveControl();
        var priority = 1;

        if(shapename ==="rectangle"){
            priority = 2;
        }

        newFeature.set('id', newLayerId);
        newFeature.set('name',shapename+'_'+newLayerId);
        newFeature.set('shape',shapename);
        newFeature.set('priority',priority);
        newFeature.set('isActive',false);
        newFeature.set('isBlocked',false);

        var source = new ol.source.Vector({
            features: [newFeature]
        });
        var vectorLayer = new ol.layer.Vector({
            source: source,
            style: normalStyle,
            name: shapename+'_'+newLayerId,
            id: newLayerId,
            shape: shapename,
            priority: priority,
            zIndex: 1,
            isActive: false,
            isBlocked: false
        });

        map.addLayer(vectorLayer);

        if($('#decimal_radio:checked').length === 0){
            $('#decimal_radio').prop("checked", true).trigger("change");
        }
        function isNotAtProperLatitude(yCoordinate) {
            return yCoordinate>MAX_LATITUDE_LIMIT||yCoordinate<MIN_LATITUDE_LIMIT;
        }
        function showPopup(POPUPTYPE){
            var popup = $(POPUPTYPE);
            $.fancybox.open([{
                type: 'inline',
                href: popup,
                closeClick  : true,
                closeBtn : true,
                helpers     : {
                    overlay : {closeClick: true}
                }
            }], {});
        }
		/*
		 * @param {[][]} longitudeLatitude is an Array of coordinates, x,y
		 * */
        function isNotValidCoordinates(longitudeLatitudeIn) {
            var numberOfCoordinates = longitudeLatitudeIn.length, counter=0;
            for(; counter < numberOfCoordinates; ++counter) {
                if(isNotAtProperLatitude(longitudeLatitudeIn[counter][1])) {
                    map.removeLayer(vectorLayer);
                    showPopup(PopUpType.INVALID_COORDINATES);
                    return true;
                }
            }
            return false;
        }
        function isBelowEquator(longitudeLatitudeDegree){ // @param {[][]} longitudeLatitudeDegree
            return longitudeLatitudeDegree[0][1]<0;
        }
        function getLatitudeLitmusTest(longitudeLatitudeIn){
            if(isBelowEquator(longitudeLatitudeIn)) {
                return  MIN_LATITUDE_AREA_LIMIT;
            }
            return MAX_LATITUDE_AREA_LIMIT;
        }
        function getLitmusTestCoordinates(longitudeLatitudeIn){
            return [longitudeLatitudeIn[0][0],getLatitudeLitmusTest(longitudeLatitudeIn)]
        }
        function isCoveringGreyArea(longitudeLatitudeIn) {
            var distanceBetween2SelectedPoints=getDistanceInKmOn4326(longitudeLatitudeIn[0],longitudeLatitudeIn[1]),
                litmus=new Array();
            litmus = getLitmusTestCoordinates(longitudeLatitudeIn);
            var distanceBetweenCenterAndMaxLatitude = getDistanceInKmOn4326(longitudeLatitudeIn[0],litmus);
            if(distanceBetween2SelectedPoints > distanceBetweenCenterAndMaxLatitude) {
                map.removeLayer(vectorLayer);
                showPopup(PopUpType.INVALID_COORDINATES);
                return true;
            }
            else{ return false; }
        }
        function calculateAreaCircleKmSquared(flatCoords) {
            var radius=getDistanceInKmOnSameLatitude([flatCoords[0], flatCoords[1]],[flatCoords[2], flatCoords[3]]);
            return Math.PI*radius*radius;
        }
        function isVeryLargeArea(areaKM){
            if(areaKM>MAX_AREA_SQ_KM) {
                return true;
            }
            return false;
        }
        function isNotValidCenterPoint(longitudeLatitudeIn){
            if(isNotValidCoordinates(longitudeLatitudeIn)) {
                return true;
            }
            else if(isCoveringGreyArea(longitudeLatitudeIn)) {
                return true;
            }
            else {
                return false;
            }
        }
        function isNotValidCircle(circleIn){
            var centerIn = circleCoordinateEndDraw[0];
            var secondPoint = circleCoordinateEndDraw[1];
            var longitudeLatitudeIn = new Array();
            longitudeLatitudeIn[0] = ol.proj.transform(centerIn, 'EPSG:3857', 'EPSG:4326');
            longitudeLatitudeIn[1] = ol.proj.transform(secondPoint, 'EPSG:3857', 'EPSG:4326');
            if(isNotValidCenterPoint(longitudeLatitudeIn)) { return true; }
            if(isVeryLargeArea(calculateAreaCircleKmSquared(circleIn.flatCoordinates))) { showPopup(PopUpType.WARN_BIG_AREA); }
            return false;
        }
        function isNotValidPolygon(polygonIn){
            var p=polygonIn.flatCoordinates,
                startCounter=0, endCounter = p.length-2,
                longitudeLatitudeIn = new Array();
            for( ; startCounter < endCounter; ++startCounter){
                longitudeLatitudeIn[startCounter] = ol.proj.transform([p[startCounter],p[startCounter+1]], 'EPSG:3857', 'EPSG:4326');
            }
            if(isNotValidCoordinates(longitudeLatitudeIn)) { return true; }
            if(isVeryLargeArea(areaPolygon(polygonIn))) { showPopup(PopUpType.WARN_BIG_AREA); }
            return false;
        }
        switch(shapename) {
            case "rectangle":
                var coords = vectorLayer.getSource().getFeatures()[0].getGeometry().getFlatCoordinates();
                var start = [coords[0], coords[1]];
                var end = [coords[4], coords[5]];
                var longitudeLatitude = new Array();
                longitudeLatitude[0] = ol.proj.transform(start, 'EPSG:3857', 'EPSG:4326');
                longitudeLatitude[1] = ol.proj.transform(end, 'EPSG:3857', 'EPSG:4326');
                if(!isNotValidCoordinates(longitudeLatitude)) {
                    //TODO: Odwrotne rysowanie
                    addRectForm(vectorLayer.get("priority"), vectorLayer.get("name"), null, start, end, 'EPSG:3857');
                    addToMapLayerList(vectorLayer.get("priority"), vectorLayer.get("name"), null, vectorLayer.get("id"));
                }
                break;
            case "polygon":
                var polygon = vectorLayer.getSource().getFeatures()[0].getGeometry();
                if (!isNotValidPolygon(polygon)) {
                    addPolyForm(vectorLayer.get("priority"), vectorLayer.get("name"), null, vectorLayer.getSource().getFeatures()[0].getGeometry().flatCoordinates, 'EPSG:3857');
                    addToMapLayerList(vectorLayer.get("priority"), vectorLayer.get("name"), null, vectorLayer.get("id"));
                }
                break;
            case "centerPoint":
                var circle = vectorLayer.getSource().getFeatures()[0].getGeometry(),
                    center = circleCoordinateEndDraw[0];
                if (!isNotValidCircle(circle)) {
                    addCircleForm(vectorLayer.get("priority"), vectorLayer.get("name"), null, center, [circle.getFlatCoordinates()[2], circle.getFlatCoordinates()[3]], 'EPSG:3857');
                    addToMapLayerList(vectorLayer.get("priority"), vectorLayer.get("name"), null, vectorLayer.get("id"));
                }
                break;
            default:
                break;
        }

    });
    //map end

    $(function() {
        $("#uploadKML input:file").change(function (){

            var ext = $("#uploadKML input:file").val().split('.').pop().toLowerCase();
            var success = $("#kml_import_succes");
            var wrong = $("#kml_import_wrong");
            var error1 = $(PopUpType.NO_POLYGON_DEFINED);
            var error2 = $(PopUpType.WRONG_COORDINATES);

            if(ext !== "kml") {
                $.fancybox.open([{
                    type: 'inline',
                    href: wrong,
                    closeClick  : true,
                    closeBtn : true,
                    afterClose : function(){
                        $("#uploadKML input:file").val("");
                        $("#uploadKML .fake-input-field p").text("Upload file");
                        $("#uploadKML .fake-input-field p").addClass("fake-input-placeholder");
                    },
                    helpers     : {
                        overlay : {closeClick: true}
                    }
                }]);
            }

            else {

                var reader = new FileReader();
                reader.readAsText(this.files[0]);
                reader.onload = function () {

                    var xmlData = $(reader.result);
                    var placemarks = $(xmlData).find("Placemark");
                    var polygons = $(xmlData).find("Polygon");

                    if(polygons.length < 1) {
                        $.fancybox.open([{
                            type: 'inline',
                            href: error1,
                            closeClick  : true,
                            closeBtn : true,
                            afterClose : function(){
                                $("#uploadKML input:file").val("");
                                $("#uploadKML .fake-input-field p").text("Upload file");
                                $("#uploadKML .fake-input-field p").addClass("fake-input-placeholder");
                            },
                            helpers     : {
                                overlay : {closeClick: true}
                            }
                        }]);
                    }
                    else {

                        var goodCoords = true;

                        $(placemarks).each(function(){

                            var layerCoordsHTML = $(this).find("coordinates").get(0);
                            var layerCoordsText = $(layerCoordsHTML).text();
                            var layerCoordsArray = layerCoordsText.replace(/\n|\t/g,"").split(" ");

                            var nameHTML = $(this).find("name").get();
                            var nameText = $(nameHTML).text();
                            var descHTML = $(this).find("description").get();
                            var descText = $(descHTML).text();
                            var priority = parseInt(descText.replace( /^\D+/g, ""));

                            var cleanedCoordArray = [];
                            var coordCounter = 0;

                            for(var i=0; i<layerCoordsArray.length; i++) {
                                if (layerCoordsArray[i] == "") {
                                    continue;
                                }
                                else {
                                    cleanedCoordArray.push(layerCoordsArray[i]);
                                    coordCounter++;
                                }
                            }

                            var firstCoord = cleanedCoordArray[0].replace(/\W/g, "");
                            var lastCoord = cleanedCoordArray[cleanedCoordArray.length-1].replace(/\W/g, "");

                            if (coordCounter < 4 || firstCoord !== lastCoord) {

                                goodCoords = false;
                                return;
                            }
                            else {

                                var layerCoordsList = [];
                                var tmpList = [];

                                for(var j = 0; j < cleanedCoordArray.length; j++){

                                    tmpList = cleanedCoordArray[j].split(",");
                                    layerCoordsList.push(tmpList[1]);
                                    layerCoordsList.push(tmpList[0]);
                                }

                                var polygonName = "polygon_"+getNewLayerId();
                                addPolygon(null, polygonName, null, layerCoordsList);
                                addPolyForm(null, polygonName, null, layerCoordsList, 'EPSG:4326');

                                if (nameText !== "") {

                                    modifyLayerName("polygon", layerID-1, nameText);
                                }

                                if (priority !== "" && priority <= 100) {

                                    modifyLayerPriority("polygon", layerID-1, priority);
                                }
                            }
                        });

                        fitMapToExtent();

                        if (goodCoords == true) {
                            $.fancybox.open([{
                                type: 'inline',
                                href: success,
                                closeClick  : true,
                                closeBtn : true,
                                afterClose : function(){
                                    $("#uploadKML input:file").val("");
                                    $("#uploadKML .fake-input-field p").text("Upload file");
                                    $("#uploadKML .fake-input-field p").addClass("fake-input-placeholder");
                                },
                                helpers     : {
                                    overlay : {closeClick: true}
                                }
                            }]);
                        }
                        else {
                            $.fancybox.open([{
                                type: 'inline',
                                href: error2,
                                closeClick  : true,
                                closeBtn : true,
                                afterClose : function(){
                                    $("#uploadKML input:file").val("");
                                    $("#uploadKML .fake-input-field p").text("Upload file");
                                    $("#uploadKML .fake-input-field p").addClass("fake-input-placeholder");
                                },
                                helpers     : {
                                    overlay : {closeClick: true}
                                }
                            }]);
                        }
                    }

                }
            }

        });
    });

    $("#coordinates_templates .urf_form .two-cols .coord_row.delete .delete_button").click(function(){
        select.getFeatures().clear();
        var formTodelete = $(this).parent().parent().parent();
        var layerToDelete = $(formTodelete).attr("id");
        var layer_id = layerToDelete.split("_")[1];
        var shape = layerToDelete.split("_")[0];
        var mapLayers = getLayerList(map);
        var mapListRowtoDelete = $('#'+layerToDelete+'_map_list');
        if(shape === 'rectangle'){
            decreseRectangleCounter();
        }

        $("#map_layers .map_layers_layer#"+layerToDelete).remove();

        $(formTodelete).remove();

        $(mapListRowtoDelete).remove();

        for(var i=0; i<mapLayers.length; i++) {
            if(mapLayers[i] instanceof ol.layer.Vector){
                if(parseFloat(layer_id) === parseFloat(mapLayers[i].get("id"))){
                    map.removeLayer(mapLayers[i]);
                }
            }
        }
        if (($('.rect_form').length)+($('.poly_form').length)+($('.center_point_form').length)>3) {
            // $('#select_shape').valid();
        }
    });

    // event where selected shapes are deleted
    $("#coordinates_templates #map_layer_row_template .map_layers_layer .map_layers_delete img").click(function(){
        select.getFeatures().clear();
        var layerToDelete = $(this).parent().parent().attr('id').split('_map_list')[0];
        var formToDelete = $('#'+layerToDelete);
        var mapListRowtoDelete = $('#'+layerToDelete+'_map_list');
        var mapLayers = getLayerList(map);
        var layer_id = layerToDelete.split("_")[1];
        var shape = layerToDelete.split("_")[0];
        if(shape === 'rectangle'){
            decreseRectangleCounter();
        }
        $(formToDelete).remove();
        $(mapListRowtoDelete).remove();
        for(var i=0; i<mapLayers.length; i++) {
            if(mapLayers[i] instanceof ol.layer.Vector){
                if(parseFloat(layer_id) === parseFloat(mapLayers[i].get("id"))){
                    map.removeLayer(mapLayers[i]);
                }
            }
        }
        removeInteraction('select');
    });

    $("#coordinates_templates #map_layer_row_template .map_layers_layer .map_layers_edit img").click(function(){

        var layerForm = $(this).parent().parent();
        var map_layers_priority = $(layerForm).find('.map_layers_priority');
        var map_layers_name = $(layerForm).find('.map_layers_name');
        /*var map_layers_edit = $(layerForm).find('.map_layers_edit img');*/

        if($(this).html() === 'save'){
            modifyMapListPriority(layerForm);
            modifyMapListName(layerForm);
        }
        else{
            $(map_layers_priority).find(".error_message").hide();
            $(map_layers_name).find(".error_message").hide();

            $(map_layers_name).addClass("editing");
            $(map_layers_priority).addClass("editing");

            var prioritySpan = $(map_layers_priority).find("span");
            var nameSpan = $(map_layers_name).find("span");

            var priorityInput = $(map_layers_priority).find("input");
            var nameInput = $(map_layers_name).find("input");

            $(prioritySpan).hide();
            $(priorityInput).show();
            priorityInput.value = prioritySpan.text();
            $(priorityInput).val($(prioritySpan).html());

            $(nameSpan).hide();
            $(nameInput).show();
            nameInput.value = nameSpan.text();
            $(nameInput).val($(nameSpan).html());

            /*$(map_layers_edit).empty();
            $(map_layers_edit).html('');*/
        }

    });

    $("#coordinates_templates #map_layer_row_template .map_layers_layer .map_layers_priority input").focusout(function(){
        var layerForm = $(this).parent().parent();
        modifyMapListPriority(layerForm);
    });


    $("#coordinates_templates #map_layer_row_template .map_layers_layer .map_layers_name input").focusout(function(){
        var layerForm = $(this).parent().parent();
        modifyMapListName(layerForm);
    });

    $("#default_form_extent").keypress(function(event) {
        if (event.keyCode == 44 || event.charCode== 44) {
            event.preventDefault();
        }
    });

    $(".switch_area .switch").click(function(){
        if($(this).attr('id') === "on_map" && !($(this).hasClass('active'))){
            $("#manual_coordinates_form").hide();
            $("#map_container2").show();
            $(".switch_area #on_map").addClass('active');
            $(".switch_area #manual").removeClass('active');
            fitMapToExtent();
        }
        else if($(this).attr('id') === "manual" && !($(this).hasClass('active'))){
            $("#map_container2").hide();
            $("#manual_coordinates_form").show();
            $(".switch_area #manual").addClass('active');
            $(".switch_area #on_map").removeClass('active');
        } else {
            // had to add because it is CRITICAL issue
        }
    });

    $("#coordinates_buttons #add_button").click(function(){
        var shape = $("#select_shape").val();
        switch(shape) {
            case "polygon":
                addPolyForm(null, null, null, null);
                break;
            case "centerPoint":
                addCircleForm(null, null, null, null, null, null,null);
                break;
            case "rectangle":
                addRectForm(null, null, null, null, null, null, null);
                break;
            default:
                break;
        }
        if($('.name_map_layers').length > 0) {
          $('.name_map_layers')[0].onkeydown=function(e) {
            if($('.name_map_layers')[0].value.length>=5) {
              e.preventDefault();
              return false;
            }
            return true;
          };
        }
        // $('#select_shape').valid();
    });

    $("#select_system input[name=system]:radio").change(function () {

        if ($("#dms_radio:checked").length > 0) {
            $('.points').attr("placeholder","53*34'47.9"+'"'+"N,7*39'0.0"+'"E,54*12'+"'0.0"+'"N,18*11'+"'59.9"+'"E,52*57'+"'0.0"+'"N,27*41'+"'24.0"+'"E,51*6'+"'35.9"+'"N,15*54'+"'36.0"+'"E,51*26'+"'23.9"+'"'+"N,7*39'"+'0.0"E,53*34'+"'47.9"+'"N,7*39'+"'0.0"+'"E');
            $('.upper_left_lat').attr('placeholder', "52*23'17.1"+'"N');
            $('.upper_left_lon').attr('placeholder', "121*30'52.5"+'"W');
            $('.lower_right_lat').attr('placeholder', "42*26'18.9"+'"N');
            $('.lower_right_lon').attr('placeholder',"72*49'23.5"+'"W');
            $('.center_lat').attr('placeholder',"34*54'10.0"+'"N');
            $('.center_lon').attr('placeholder',"84*57'10.5"+'"W');
            convertInputsDecimalToDMS();
        }
        else {
            $('.points').attr("placeholder","-53.5812,7.6511,-54.2201,18.2022,-52.9511,27.6921,-51.1121,15.9111,-51.4412,7.6522,-53.5812,7.6511");
            $('.upper_left_lat').attr('placeholder', "52.3881");
            $('.upper_left_lon').attr('placeholder', "-121.5146");
            $('.lower_right_lat').attr('placeholder', "42.4386");
            $('.lower_right_lon').attr('placeholder',"-72.8232");
            $('.center_lat').attr('placeholder',"34.9028");
            $('.center_lon').attr('placeholder',"-84.9521");
            convertInputsDmsToDecimal();
        }
    });

    $("#coordinates_templates .urf_form .coord_data input").focusout(function(){
        var parent = $(this).parent().parent().parent().parent();
        var inputs = $(parent).find('.coord_data input');
        var dms = $(parent).hasClass('dms');
        var valid = $(this).valid() &&
            (!$(inputs).eq(0).length || $(inputs).eq(0).valid()) &&
            (!$(inputs).eq(1).length || $(inputs).eq(1).valid()) &&
            (!$(inputs).eq(2).length || $(inputs).eq(2).valid()) &&
            (!$(inputs).eq(3).length || $(inputs).eq(3).valid());

        if(valid === true){
            var layerName = $(parent).attr("id");
            var layerId = layerName.split('_')[1];
            var shape = layerName.split("_")[0];
            var layer = getLayerById(layerId);

            switch(shape) {
                case "rectangle":
                    var startPoints = [];
                    var endPoints = [];
                    if(dms  === false){
                        startPoints = [parseFloat($(inputs).eq(1).val()), parseFloat($(inputs).eq(0).val())];
                        endPoints = [parseFloat($(inputs).eq(3).val()), parseFloat($(inputs).eq(2).val())];
                    }
                    else{
                        var firstPointDecimal = dmsToDecimal(parseDMS($(inputs).eq(0).val()), parseDMS($(inputs).eq(1).val()));
                        var secondPointDecimal = dmsToDecimal(parseDMS($(inputs).eq(2).val()), parseDMS($(inputs).eq(3).val()));

                        startPoints = [firstPointDecimal[1],firstPointDecimal[0]];
                        endPoints = [secondPointDecimal[1],secondPointDecimal[0]];
                    }
                    if(layer === 0){
                        addRectangle(null,layerName, null, startPoints, endPoints);
                    }
                    else{
                        modifyRectangle(layer, startPoints, endPoints);
                    }
                    break;
                case "centerPoint":
                    var center = [];

                    if(dms === false){
                        center = [parseFloat($(inputs).eq(1).val()), parseFloat($(inputs).eq(0).val())];
                    }
                    else{
                        var centerDecimal = dmsToDecimal(parseDMS($(inputs).eq(0).val()), parseDMS($(inputs).eq(1).val()));

                        center = [centerDecimal[1],centerDecimal[0]];
                    }

                    var radius = parseFloat($(inputs).eq(2).val());
                    if(layer === 0){
                        addCircle(null, layerName, null, center, radius);
                    }
                    else{
                        modifyCircle(layer, center, radius);
                    }
                    break;
                default:
                    break;
            }
        }

    });

    $("#coordinates_templates .urf_form .coord_data textarea").focusout(function(){
        var valid = false;
        if($(this).closest('#coordinates_templates').length == 0 && $(this).valid() !== "undefined" ) {
            valid = $(this).valid();
        }

        if(valid === true){
            var parent = $(this).parent().parent().parent().parent();
            var dms = $(parent).hasClass('dms');
            var layerName = $(parent).attr("id");
            var layerId = layerName.split('_')[1];
            var layer = getLayerById(layerId);
            var textarea = $(parent).find('.coord_data textarea');
            var coordinatesList = [];
            if(dms === false){
                coordinatesList = cleanCoords($(textarea).first().val());
            }
            else{
                var textareaPoints = cleanCoords($(textarea).val());

                var point = [];
                for(var i = 0; i < textareaPoints.length-1; i=i+2){
                    point = dmsToDecimal(parseDMS(textareaPoints[i]), parseDMS(textareaPoints[i+1]));
                    coordinatesList.push(point[0]);
                    coordinatesList.push(point[1]);
                }
            }


            if(layer === 0){
                addPolygon(null, layerName, null, coordinatesList);
            }
            else{
                modifypolygon(layer, coordinatesList);
            }
        }

    });

    $("#coordinates_templates #map_layer_row_template .map_layers_layer > td:not(.map_layers_delete):not(.map_layers_edit)").click(function(){
        if($(this).hasClass("editing") !== true){
            var name = $(this).parent().attr("id").split("_map_list")[0];
            var parent = $(this).parent();

            var layerId = name.split('_')[1];

            var layer = getLayerById(layerId);
            var mapLayers = getLayerList(map);
            var layersOnList = $(".map_layers_layer");

            $(layersOnList).each(function(){
                $(this).removeClass('active');
            });

            select.getFeatures().clear();

            for(var i=0; i<mapLayers.length; i++) {
                if(mapLayers[i] instanceof ol.layer.Vector){
                    if(mapLayers[i] === layer && layer.getSource().getFeatures()[0].get('isActive') !== true){

                        mapLayers[i].getSource().getFeatures()[0].set('isActive', true);

                        if(!$("#edit").hasClass('active')){
                            $("#edit").click();
                        }

                        $(parent).addClass('active');

                        select.getFeatures().push(mapLayers[i].getSource().getFeatures()[0]);
                        select.setActive(true);


                    }
                    else{
                        mapLayers[i].getSource().getFeatures()[0].set('isActive', false);
                        mapLayers[i].getSource().getFeatures()[0].setStyle(normalStyle);
                    }
                }
            }
        }

    });

    $("#coordinates_templates input.name").focusout(function(){
        var valid = false;
        if($(this).closest('#coordinates_templates').length == 0 && $(this).valid() !== "undefined" ) {
            valid = $(this).valid();
        }
        if(valid === true) {
            var newName = $(this).val();
            var layer_name = $(this).parent().parent().parent().parent().attr("id");
            if (layer_name) {
                var shape = layer_name.split("_")[0];
                var layer_id = layer_name.split("_")[1];

                modifyLayerName(shape, layer_id, newName);
            }
        }
    });

    $("#coordinates_templates input.priority").focusout(function(){
        var valid = false;
        if($(this).closest('#coordinates_templates').length == 0 && $(this).valid() !== "undefined" ) {
            valid = $(this).valid();
        }
        if (valid === true){
            var newPriority = $(this).val();
            var layer_name = $(this).parent().parent().parent().attr("id");
            if (layer_name) {
                var shape = layer_name.split("_")[0];
                var layer_id = layer_name.split("_")[1];

                modifyLayerPriority(shape, layer_id, newPriority);
            }
        }
    });
    $('#coordinates_templates input.priority').bind('keyup mouseup', function () {
        $(this).focus();
    });

    // hide error messages when switched to edit-on-map mode and if priorities and shape names are correct
    $("#on_map").on("click", function (){

        $(".map_layers_layer").each(function(){

            var id = $(this).attr("layer_id");
            if (id) {
                var layer = $(this).attr("id");
                var shape = layer.split("_")[0];
                var priority = $(this).find('.map_layers_priority span').html();
                var name = $(this).find('.map_layers_name span').html();
                var pathToNameError = $("#"+shape+"_"+id+"_map_list").find(".map_layers_name .error_message");
                var pathToPriError = $("#"+shape+"_"+id+"_map_list").find(".map_layers_priority .error_message");

                var validName = validateLayerName(id, name);
                var validPriority = validateLayerPriority(id, priority);

                if (validName === true) {
                    pathToNameError.hide();
                }

                if (validPriority === true) {
                    pathToPriError.hide();
                }
            }
        });
    });

    //update validation on input fields after switched to manual-edit mode
    $("#manual").on("click", function (){

        $(".valid-map-name, .valid-map-pri").trigger('focusout');

    });

    var event = new Event('drawn');

    //RECTANGLE
    function addRectangleBlocked(startPoints, endPoints){
        startPoints = ol.proj.transform(startPoints, 'EPSG:4326', 'EPSG:3857');
        endPoints = ol.proj.transform(endPoints, 'EPSG:4326', 'EPSG:3857');
        var geometry = new ol.geom.Polygon(null);
        geometry.setCoordinates([
            [startPoints, [startPoints[0], endPoints[1]], endPoints, [endPoints[0], startPoints[1]], startPoints]
        ]);

        var feature = new ol.Feature({
            geometry: geometry,
            isActive: false,
            isBlocked: true
        });

        var source = new ol.source.Vector({
            features: [feature]
        });

        var vectorLayer = new ol.layer.Vector({
            source: source,
            style: blockedStyle,
            isActive: false,
            isBlocked: true
        });

        map.addLayer(vectorLayer);
    }

    function addRectangleNamed(startPoints, endPoints, shapeColor, shapeName, shapeDisplayName){ // color as a list of numbers for rgba format, ex.: '12, 153, 253'
        startPoints = ol.proj.transform(startPoints, 'EPSG:4326', 'EPSG:3857');
        endPoints = ol.proj.transform(endPoints, 'EPSG:4326', 'EPSG:3857');
        var geometry = new ol.geom.Polygon(null);
        geometry.setCoordinates([
            [startPoints, [startPoints[0], endPoints[1]], endPoints, [endPoints[0], startPoints[1]], startPoints]
        ]);

        var feature = new ol.Feature({
            geometry: geometry,
            isActive: false,
            isBlocked: true
        });

        var source = new ol.source.Vector({
            features: [feature]
        });

        var namedStyle = createNamedStyle(shapeColor, shapeDisplayName);

        var vectorLayer = new ol.layer.Vector({
            name: shapeName,
            source: source,
            style: namedStyle,
            isActive: false,
            isBlocked: true
        });

        map.addLayer(vectorLayer);
    }


    function addRectangleShapeAndForm(priority, shapeName, startPoints, endPoints){
        //proj:4326, first coordinate longitude
        var layerName = addRectangle(priority, null, shapeName, startPoints, endPoints);
        addRectForm(priority, layerName, shapeName, startPoints, endPoints, 'EPSG:4326');

      if($('.name_map_layers').length > 0) {
        $('.name_map_layers')[0].onkeydown = function (e) {
          if ($('.name_map_layers')[0].value.length >= 5) {
            e.preventDefault();
            return false;
          }
          return true;
        };
      }
    }

    function addRectangle(priority, layerName, shapeName, startPoints, endPoints){
        if(layerName === null){
            layerName = "rectangle_"+getNewLayerId();
        }
        if(shapeName === null){
            shapeName = layerName;
        }
        if(priority === null) {
            priority = 2;
        }
        var geometryFunction, maxPoints;
        var value = 'LineString';

        var id = layerName.split("_")[1];
        maxPoints = 2;

        var startEnd = getMinimumRectangleCords([startPoints,endPoints]);

        startPoints = ol.proj.transform(startEnd[0], 'EPSG:4326', 'EPSG:3857');
        endPoints = ol.proj.transform(startEnd[1], 'EPSG:4326', 'EPSG:3857');

        var geometry = new ol.geom.Polygon(null);

        geometry.setCoordinates([
            [startPoints, [startPoints[0], endPoints[1]], endPoints, [endPoints[0], startPoints[1]], startPoints]
        ]);

        var geometryMultiPolygon = new ol.geom.MultiPolygon(null);

        geometryMultiPolygon.appendPolygon(geometry);



        var feature = new ol.Feature({
            geometry: geometryMultiPolygon,

            name: shapeName,
            priority: priority,
            shape: 'rectangle',
            id: id,
            isActive: false,
            isBlocked: false
        });

        var source = new ol.source.Vector({
            features: [feature]
        });

        var vectorLayer = new ol.layer.Vector({
            source: source,
            style: normalStyle,
            name: shapeName,
            shape: 'rectangle',
            id: id,
            priority: priority,
            zIndex: 1,
            isActive: false,
            isBlocked: false
        });

        map.addLayer(vectorLayer);

        var upperLeftLon = vectorLayer.getSource().getFeatures()[0].getGeometry().getExtent()[0];
        var upperLeftLat = vectorLayer.getSource().getFeatures()[0].getGeometry().getExtent()[1];
        var lowerRightLon = vectorLayer.getSource().getFeatures()[0].getGeometry().getExtent()[2];
        var lowerRightLat = vectorLayer.getSource().getFeatures()[0].getGeometry().getExtent()[3];

        addToMapLayerList(vectorLayer.get("priority"), layerName, shapeName, id);

        return layerName;
    }

    function modifyRectangle(layer, startPoints, endPoints){
        var startEnd = getMinimumRectangleCords([startPoints,endPoints]);

        startPoints = ol.proj.transform(startEnd[0], 'EPSG:4326', 'EPSG:3857');
        endPoints = ol.proj.transform(startEnd[1], 'EPSG:4326', 'EPSG:3857');
        var geometry = new ol.geom.Polygon(null);
        geometry.setCoordinates([[startPoints, [startPoints[0], endPoints[1]], endPoints, [endPoints[0], startPoints[1]], startPoints]]);

        layer.getSource().getFeatures()[0].setGeometry(geometry);
        //TODO: set priority(better in nnew listener)
    }

    function wrapTemplateInForm(template) {
        var form = $('<form></form>');
        return form.append(template);
    }

    function addRectForm(priority, layerName, shapeName, upperLeft, lowerRight, proj){
        increseRectangleCounter();
        if(priority === null){
            priority = 2;
        }
        if(layerName === null){
            layerName = "rectangle_"+getNewLayerId();
        }
        if(shapeName === null){
            shapeName = layerName;
        }
        if(upperLeft === null){
            upperLeft = ["",""];
        }
        else{
            if(proj !== 'EPSG:4326'){
                upperLeft = ol.proj.transform(upperLeft, 'EPSG:3857', 'EPSG:4326');
            }
            upperLeft = [longitudeModulo(upperLeft[0]).toFixed(4), upperLeft[1].toFixed(4)];
        }
        if(lowerRight === null){
            lowerRight = ["",""];
        }
        else{
            if(proj !== 'EPSG:4326'){
                lowerRight = ol.proj.transform(lowerRight, 'EPSG:3857', 'EPSG:4326');
            }
            lowerRight = [longitudeModulo(lowerRight[0]).toFixed(4), lowerRight[1].toFixed(4)];
        }


        var template= $("#coordinates_templates > .rect_form").clone(true);
        var destination = $("#coordinates_content");



        var id = layerName.split("_")[1];

        var priorityInput = $(template).find(".priority").first();
        var nameInput = $(template).find(".coord_row.name input.name").first();
        var upperLeftPointLat = $(template).find("input.upper_left_lat").first();
        var upperLeftPointLon = $(template).find("input.upper_left_lon").first();
        var lowerRightPointLat = $(template).find("input.lower_right_lat").first();
        var lowerRightPointLon= $(template).find("input.lower_right_lon").first();

        if($('#select_system div input#dms_radio:checked').length > 0){
            $(template).addClass('dms');
            $(upperLeftPointLat).attr('placeholder', "52*23'17.1"+'"N');
            $(upperLeftPointLon).attr('placeholder', "121*30'52.5"+'"W');
            $(lowerRightPointLat).attr('placeholder', "42*26'18.9"+'"N');
            $(lowerRightPointLon).attr('placeholder',"72*49'23.5"+'"W');
        }
        else {
            $(upperLeftPointLat).attr('placeholder', "52.3881");
            $(upperLeftPointLon).attr('placeholder', "-121.5146");
            $(lowerRightPointLat).attr('placeholder', "42.4386");
            $(lowerRightPointLon).attr('placeholder',"-72.8232");
        }

        $(priorityInput).val(priority);
        $(priorityInput).attr('name', "form.affectedArea.priority");

        $(nameInput).val(shapeName);
        $(nameInput).attr('name', "form.affectedArea.name");

        $(upperLeftPointLat).val(upperLeft[1]);
        $(upperLeftPointLat).attr('name', "form.affectedArea.upperLeft.latitudeAsCoordinate.decimal");

        $(upperLeftPointLon).val(upperLeft[0]);
        $(upperLeftPointLon).attr('name', "form.affectedArea.upperLeft.longitudeAsCoordinate.decimal");

        $(lowerRightPointLat).val(lowerRight[1]);
        $(lowerRightPointLat).attr('name', "form.affectedArea.lowerRight.latitudeAsCoordinate.decimal");

        $(lowerRightPointLon).val(lowerRight[0]);
        $(lowerRightPointLon).attr('name', "form.affectedArea.lowerRight.longitudeAsCoordinate.decimal");

        $(template).attr("id", layerName);
        $(template).attr("layer_id", id);

        // window event to receive in typescript
        window.dispatchEvent(event);

        template = wrapTemplateInForm(template);
        $(destination).append($(template));
        updateMapValidation($(template));
        $("#select_shape").val('polygon');

    }

    function modifyRectForm(priority, name, form_id, upperLeft, lowerRight){

        upperLeft = ol.proj.transform(upperLeft, 'EPSG:3857', 'EPSG:4326');
        lowerRight = ol.proj.transform(lowerRight, 'EPSG:3857', 'EPSG:4326');
        if(priority === null){
            priority = 2;
        }
        upperLeft[0] = longitudeModulo(upperLeft[0]);
        lowerRight[0] = longitudeModulo(lowerRight[0]);
        var form = $("#"+form_id);
        if(form instanceof jQuery){
            $(form).find(".priority").first().val(priority);
            $(form).find(".coord_row.name input.name").first().val(name);
            $(form).find("input.upper_left_lat").first().val(parseFloat(upperLeft[1]).toFixed(4));
            $(form).find("input.upper_left_lon").first().val(parseFloat(upperLeft[0]).toFixed(4));
            $(form).find("input.lower_right_lat").first().val(parseFloat(lowerRight[1]).toFixed(4));
            $(form).find("input.lower_right_lon").first().val(parseFloat(lowerRight[0]).toFixed(4));
        }

    }

    //Circle
    function addCircleBlocked(center, radius){
        var radiusInDegree = getRadius(center, radius);
        var geometry = new ol.geom.Circle(ol.proj.transform(center, 'EPSG:4326', 'EPSG:3857'), radiusInDegree);

        var feature = new ol.Feature({
            geometry: geometry,
            isActive: false,
            isBlocked: true
        });

        var source = new ol.source.Vector({
            features: [feature]
        });

        var vectorLayer = new ol.layer.Vector({
            source: source,
            style: blockedStyle,
            isActive: false,
            isBlocked: true
        });

        map.addLayer(vectorLayer);
    }

    function addCircleNamed(center, radius, shapeColor, shapeName, shapeDisplayName){ // color as a list of numbers for rgba format, ex.: '12, 153, 253'
        var radiusInDegree = getRadius(center, radius);
        var geometry = new ol.geom.Circle(ol.proj.transform(center, 'EPSG:4326', 'EPSG:3857'), radiusInDegree);

        var feature = new ol.Feature({
            geometry: geometry,
            isActive: false,
            isBlocked: true
        });

        var source = new ol.source.Vector({
            features: [feature]
        });

        var namedStyle = createNamedStyle(shapeColor, shapeDisplayName);

        var vectorLayer = new ol.layer.Vector({
            name: shapeName,
            source: source,
            style: namedStyle,
            isActive: false,
            isBlocked: true
        });

        map.addLayer(vectorLayer);
    }

    function addCircleShapeAndForm(priority, shapeName, center, radius){
        //proj:4326, first coordinate longitude
        var layerName = addCircle(priority, null, shapeName,  center, radius);
        addCircleForm(priority, layerName, shapeName, center, radius, 'EPSG:4326');

      if($('.name_map_layers').length > 0) {
        $('.name_map_layers')[0].onkeydown = function (e) {
          if ($('.name_map_layers')[0].value.length >= 5) {
            e.preventDefault();
            return false;
          }
          return true;
        };
      }
    }

    function addCircle(priority, layerName, shapeName, center, radius){
        if(layerName === null){
            layerName = "centerPoint_"+getNewLayerId();
        }
        if(shapeName === null){
            shapeName = layerName;
        }
        if(priority === null){
            priority = 1;
        }
        var id = layerName.split("_")[1];

        var radiusInDegree = getRadius(center, radius);
        var geometry = new ol.geom.Circle(ol.proj.transform(center, 'EPSG:4326', 'EPSG:3857'), radiusInDegree);

        var feature = new ol.Feature({
            geometry: geometry,
            name: shapeName,
            id: id,
            priority: priority,
            shape: 'centerPoint',
            isActive: false,
            isBlocked: false
        });

        var source = new ol.source.Vector({
            features: [feature]
        });

        var vectorLayer = new ol.layer.Vector({
            source: source,
            style: normalStyle,
            name: shapeName,
            shape: 'centerPoint',
            id: id,
            priority: priority,
            zIndex: 1,
            isActive: false,
            isBlocked: false
        });
        map.addLayer(vectorLayer);

        addToMapLayerList(vectorLayer.get("priority"), layerName, shapeName, id);

        return layerName;
    }

    function modifyCircle(layer, center, radius){
        var radiusInDegree = getRadius(center, radius);
        var geometry = new ol.geom.Circle(ol.proj.transform(center, 'EPSG:4326', 'EPSG:3857'), radiusInDegree);

        layer.getSource().getFeatures()[0].setGeometry(geometry);
    }


    function addCircleForm(priority, layerName, shapeName, center, secondPoint, proj){
        var radius;
        if(priority === null){
            priority = 1;
        }
        if(layerName === null){
            layerName = "centerPoint_"+getNewLayerId();
        }
        if(shapeName === null){
            shapeName = layerName;
        }
        if(secondPoint === null){
            radius = 3;
        }
        else{
            if(proj !== 'EPSG:4326'){
                radius = getDistanceInKmOnSameLatitude(center, secondPoint);
            }
            else{
                radius = secondPoint;
            }
        }

        radius = Math.ceil(radius);

        if(center === null){
            center = ["",""];
        }
        else{
            if(proj !== 'EPSG:4326'){
                center = ol.proj.transform(center, 'EPSG:3857', 'EPSG:4326');
            }
            center = [longitudeModulo(center[0]).toFixed(4), center[1].toFixed(4)];
        }
        var template= $("#coordinates_templates > .center_point_form").clone(true);
        var destination = $("#coordinates_content");

        var id = layerName.split("_")[1];
        var priorityInput = $(template).find(".priority").first();
        var nameInput = $(template).find(".coord_row.name input.name").first();

        var centerPointLat = $(template).find("input.center_lat").first();
        var centerPointLon = $(template).find("input.center_lon").first();
        var radiusinput = $(template).find("input.radius").first();

        $(priorityInput).val(priority);
        $(priorityInput).attr('name', "form.centerPoints["+id+"].priority");

        $(nameInput).val(shapeName);
        $(nameInput).attr('name', "form.centerPoints["+id+"].name");



        $(centerPointLat).val(center[1]);
        $(centerPointLat).attr('name', "form.centerPoints["+id+"].center.latitudeAsCoordinate.decimal");

        $(centerPointLon).val(center[0]);
        $(centerPointLon).attr('name', "form.centerPoints["+id+"].center.longitudeAsCoordinate.decimal");
        $(radiusinput).val(radius);
        $(radiusinput).attr('name', "form.centerPoints["+id+"].radius");

        if ($("#dms_radio:checked").length >0) {
            $(template).addClass('dms');
            $(centerPointLat).attr('placeholder',"34*54'10.0"+'"N');
            $(centerPointLon).attr('placeholder',"84*57'10.5"+'"W');
        }
        else {
            $(centerPointLat).attr('placeholder',"34.9028");
            $(centerPointLon).attr('placeholder',"-84.9521");
        }

        $(template).attr("id", layerName);
        $(template).attr("layer_id", id);
        template = wrapTemplateInForm(template);
        $(destination).append($(template));
        updateMapValidation($(template));


        var circleCoords = {
            "priority": priority,
            "name": layerName,
            "center": {
                "latitudeAsCoordinate": { "decimal" : center[1]},
                "longitudeAsCoordinate": { "decimal" : center[0] }
            },
            "radius": radius
        };

        var circleVals = [];

        // if($("[name='circleCoords']").val().length != 0) {
        //     circleVals = JSON.parse($("[name='circleCoords']").val());
        // }

        circleVals.push(circleCoords);

        // window event to receive in typescript
        window.dispatchEvent(event);
    }

    function modifyCircleForm(priority, name, form_id, center, end){
        var radius = getDistanceInKmOnSameLatitude(center, end);
        var center = ol.proj.transform(center, 'EPSG:3857', 'EPSG:4326');

        radius = Math.ceil(radius);
        if(priority === null){
            priority = 1;
        }
        center[0] = longitudeModulo(center[0]);
        var form = $("#"+form_id);
        if(form instanceof jQuery){
            $(form).find(".priority").first().val(priority);
            $(form).find(".coord_row.name input.name").first().val(name);
            $(form).find("input.center_lat").first().val(center[1]);
            $(form).find("input.center_lon").first().val(center[0]);
            $(form).find("input.radius").first().val(radius);
        }

    }

    function isNotArray(pointsStr){
        return !(pointsStr instanceof Array);
    }

    function makeArray(pointsStr) {
        return cleanCoords(pointsStr);
    }

    //Polygon
    function addPolygoBlocked(pointsStr){
        var pointsArray;
        if(isNotArray(pointsStr)) {
            pointsArray = makeArray(pointsStr);
        } else {
            pointsArray = pointsStr;
        }
        //proj:4326, first coordinate latitude
        var points = getPolygonList(pointsArray);
        var geometry = new ol.geom.Polygon(points);
        var feature = new ol.Feature({
            geometry: geometry,
            isBlocked: true
        });
        var source = new ol.source.Vector({
            features: [feature]
        });
        var vectorLayer = new ol.layer.Vector({
            source: source,
            style: blockedStyle,
            isBlocked: true
        });
        map.addLayer(vectorLayer);
    }

    function addPolygonNamed(pointsStr, shapeColor, shapeName, shapeDisplayName){ // color as a list of numbers for rgba format, ex.: '12, 153, 253'
        var pointsArray;
        if(isNotArray(pointsStr)) {
            pointsArray = makeArray(pointsStr);
        } else {
            pointsArray = pointsStr;
        }
        //proj:4326, first coordinate latitude
        var points = getPolygonList(pointsArray);
        var geometry = new ol.geom.Polygon(points);
        var feature = new ol.Feature({
            geometry: geometry,
            isBlocked: true
        });
        var source = new ol.source.Vector({
            features: [feature]
        });

        if(shapeColor == 'random') {
            shapeColor = getRandomColor();
        }
        var namedStyle = createNamedStyle(shapeColor, shapeDisplayName);

        var vectorLayer = new ol.layer.Vector({
            name: shapeName,
            source: source,
            style: namedStyle,
            isBlocked: true
        });

        map.addLayer(vectorLayer);
    }

    function addPolygonShapeAndForm(priority, shapeName, pointsStr) {
        var coordinatesList = cleanCoords(pointsStr);
        //proj:4326, first coordinate latitude
        var layerName = addPolygon(priority, null, shapeName, coordinatesList);
        addPolyForm(priority, layerName, shapeName, coordinatesList, 'EPSG:4326');
    }

    function addPolygon(priority, layerName, shapeName, pointsArrayIn){
        if(layerName === null){
            layerName = "polygon_"+getNewLayerId();
        }
        if(shapeName === null){
            shapeName = layerName;
        }
        if(priority === null) {
            priority = 1;
        }
        var id = layerName.split("_")[1];

        var points = getPolygonList(pointsArrayIn);

        var geometry = new ol.geom.Polygon(points);

        var feature = new ol.Feature({
            geometry: geometry,
            name: shapeName,
            id: id,
            shape: 'polygon',
            priority: priority,
            isBlocked: false
        });

        var source = new ol.source.Vector({
            features: [feature]
        });

        var vectorLayer = new ol.layer.Vector({
            source: source,
            style: normalStyle,
            name: shapeName,
            shape: 'polygon',
            id: id,
            priority: priority,
            zIndex: 1,
            isActive: false,
            isBlocked: false
        });

        map.addLayer(vectorLayer);

        addToMapLayerList(vectorLayer.get("priority"), layerName, shapeName, id);
        return layerName;
    }

    function modifypolygon(layer, pointsArrayIn){

        var points = getPolygonList(pointsArrayIn);

        var geometry = new ol.geom.Polygon(points);
        layer.getSource().getFeatures()[0].setGeometry(geometry);
        //TODO: set priority(better in nnew listener)
    }


    function makePointList(polyPoints) {

        var pts="";
        for(var j=0; j<polyPoints.length; ++j){
            pts+=polyPoints[j][0]+","+polyPoints[j][1]+"\r\n";
        }

        return pts;
    }
    var polyVals = [];

    function addPolyForm(priority, layerName, shapeName, polyPoints, proj){
        if(priority === null){
            priority = 1;
        }
        if(layerName === null){
            layerName = "polygon_"+getNewLayerId();
        }
        if(shapeName === null){
            shapeName = layerName;
        }
        if(polyPoints === null){
            polyPoints = [""];
        }
        else{
            if (proj !== 'EPSG:4326'){
                polyPoints = getCoordinates4326(polyPoints);
            }
            else {
                polyPoints = getCoordinates(polyPoints);
            }
        }

        var template= $("#coordinates_templates > .poly_form").clone(true);
        var destination = $("#coordinates_content");

        var id = layerName.split("_")[1];
        var nameInput = $(template).find(".coord_row.name input.name").first();

        var priorityInput = $(template).find(".priority").first();
        var points = $(template).find("textarea.points").first();

        var centerPointLat = $(template).find("input.center_lat").first();

        $(priorityInput).val(priority);
        $(priorityInput).attr('name', "form.polygonAreas["+id+"].priority");

        $(nameInput).val(shapeName);
        $(nameInput).attr('name', "form.polygonAreas["+id+"].name");

        $(points).val(breakingCoords(polyPoints));
        $(points).attr('name', "form.polygonAreas["+id+"].pointList");


        if ($("#dms_radio:checked").length >0) {
            $(template).addClass('dms');
            $(points).attr("placeholder","53*34'47.9"+'"'+"N,7*39'0.0"+'"E,-54*12'+"'0.0"+'"N,18*11'+"'59.9"+'"E,-52*57'+"'0.0"+'"N,27*41'+"'24.0"+'"E,51*6'+"'35.9"+'"N,15*54'+"'36.0"+'"E,-51*26'+"'23.9"+'"'+"N,7*39'"+'0.0"E,-53*34'+"'47.9"+'"N,7*39'+"'0.0"+'"E');
        }
        else {
            $(points).attr("placeholder","-53.5812,7.6511,-54.2201,18.2022,-52.9511,27.6921,-51.1121,15.9111,-51.4412,7.6522,-53.5812,7.6511");
        }

        $(template).attr("id", layerName);
        $(template).attr("layer_id", id);
        template = wrapTemplateInForm(template);
        $(destination).append($(template));
        updateMapValidation($(template));

        // window event to receive in typescript
        window.dispatchEvent(event);
    }

    function modifyPolyForm(priority, name, form_id, polyPoints){
        if(priority === null){
            priority = 1;
        }
        polyPoints = getCoordinates4326(polyPoints);

        var form = $("#"+form_id);
        if(form instanceof jQuery){
            $(form).find(".priority").first().val(priority);
            $(form).find(".coord_row.name input.name").first().val(name);
            $(form).find("textarea.points").first().val(polyPoints);
        }
    }


    //Utils

    function getDistance(long1,lat1,long2,lat2) {
        var wgs84SphereIn = new ol.Sphere(6378137);
        var c1 = [long1,lat1];
        var c2 = [long2,lat2];
        return wgs84SphereIn.haversineDistance(c1,c2);
    }
    function getPointPairs(points){
        var twoElementsList;
        var resultList = [];
        for (var i=0; i < (points.length-1); i+=2){
            twoElementsList = [];
            twoElementsList.push(parseFloat(points[i+1]));
            twoElementsList.push(longitudeModulo(points[i]));
            resultList.push(twoElementsList);
        }
        return resultList;
    }

    function getPolygonList(points){
        var resultList = [];

        var listInPairs = getMinimumPolygonCords(getPointPairs(points));

        for (var i=0; i < listInPairs.length; i++){
            resultList.push(ol.proj.transform(listInPairs[i], 'EPSG:4326', 'EPSG:3857'));
        }
        return [resultList];
    }

    function getCoordinates4326(coords){
        var resultList = [];
        var tmp = [];
    //	var tmp2 = [];
        for (var i=0; i < (coords.length-1); i+=2){
            tmp = [ol.proj.transform([coords[i], coords[i+1]], 'EPSG:3857', 'EPSG:4326')];
            resultList.push([parseFloat(tmp[0][1]).toFixed(4), longitudeModulo(tmp[0][0]).toFixed(4)]);
        }
        return resultList;
    }
    function getCoordinates(coords){
        var resultList = [];
        var tmp = [];
        for (var i=0; i < (coords.length-1); i+=2){
            resultList.push([parseFloat(coords[i]).toFixed(4), longitudeModulo(coords[i+1]).toFixed(4)]);
        }
        return resultList;
    }
    function splitPairs(arr) {
        var pairs = [];
        for (var i=0 ; i<arr.length ; i+=2) {
            if (arr[i+1] !== undefined) {
                pairs.push ([arr[i], arr[i+1]]);
            } else {
                pairs.push ([arr[i]]);
            }
        }
        return pairs;
    };
    function getReverseCoordinates(coords){
        var resultList = [];
        var tmp = [];
        for (var i=0; i < (coords.length-1); i+=2){
            resultList.push([coords[i+1], coords[i]]);
        }
        return resultList;
    }
    function getActiveControl(){
        var active ="";
        $("#map_controls").find($(".control")).each(function(){
            if($(this).hasClass("active")){
                active = $(this).attr("id");
            }
        });
        return active;
    }

    function getLayerById(id){
        var mapLayers = getLayerList(map);
        for(var i=0; i<mapLayers.length; i++) {
            if(mapLayers[i] instanceof ol.layer.Vector){
                if(parseFloat(id) === parseFloat(mapLayers[i].get("id"))){
                    return mapLayers[i];
                }
            }
        }
        return 0;

    }

    function getLayerByName(name){
        var mapLayers = getLayerList(map);
        var i = 2; // first two elements are map tiles
        var l = mapLayers.length;

        for( i; i < l; i++ ) {
          if(name === mapLayers[i].get('name')){
            return mapLayers[i];
          }
        }
        return 0;
    }

    function showThoseLayers(name, boolean) {
        var mapLayers = getLayerList(map);
        var i = 2; // first two elements are map tiles
        var l = mapLayers.length;

        for( i; i < l; i++ ) {
          if(name === mapLayers[i].get('name')){
            mapLayers[i].setVisible(boolean);
          }
        }
    }
    function showAllLayers(boolean) {
        var mapLayers = getLayerList(map);
        var i = 2; // first two elements are map tiles
        var l = mapLayers.length;

        for( i; i < l; i++ ) {
            mapLayers[i].setVisible(boolean);
        }
    }

    function addToMapLayerList(priority, name, shapeName, id){
        if(shapeName === null){
            shapeName = name;
        }
        var template= $("#coordinates_templates #map_layer_row_template .map_layers_layer").clone(true);
        var destination = $("#map_layers");

        $(template).find(".map_layers_priority").find('span').first().html(priority);
        $(template).find(".map_layers_name").find('span').first().html(shapeName);
        $(template).attr("id", name+"_map_list");

        $(template).attr("layer_id", id);

        $(destination).append($(template));
    }

    function getDistanceInKm(start, end) {
        var length;
        length = 0;
        var sourceProj = map.getView().getProjection();
        var c1 = ol.proj.transform(start, sourceProj, 'EPSG:4326');
        var c2 = ol.proj.transform(end, sourceProj, 'EPSG:4326');
        length = wgs84Sphere.haversineDistance(c1, c2);

        var output = (Math.round(length / 1000 * 1000) / 1000);
        return output;
    }

    function degreesToRadians(degrees){
        var pi = Math.PI;
        return degrees * (pi/180);
    }

    function getDistanceInKm2(){
        var sourceProj = map.getView().getProjection();
        //var c1 = ol.proj.transform(start, sourceProj, 'EPSG:4326');
        //var c2 = ol.proj.transform(end, sourceProj, 'EPSG:4326');
        var R = 6371e3; // metres
        var f1 = degreesToRadians(c1[1]);
        var f2 = degreesToRadians(c2[1]);
        var df = degreesToRadians(c2[1]-c1[1]);
        var dl = degreesToRadians(c2[0]-c1[0]);

        var a = Math.sin(df/2) * Math.sin(df/2) +
            Math.cos(f1) * Math.cos(f2) *
            Math.sin(dl/2) * Math.sin(dl/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        var d = Math.round(R * c / 1000 * 1000) /1000;
        return d;
    }
    function getDistanceInKmOn4326(start, end){
        var sourceProj = map.getView().getProjection();
        var c1 = start;
        var c2 = end;
        var R = 6371e3; // metres
        var f1 = degreesToRadians(c1[1]);
        var f2 = degreesToRadians(c2[1]);
        var df = degreesToRadians(c2[1]-c1[1]);
        var dl = degreesToRadians(c2[0]-c1[0]);

        var a = Math.sin(df/2) * Math.sin(df/2) +
            Math.cos(f1) * Math.cos(f2) *
            Math.sin(dl/2) * Math.sin(dl/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        var d = Math.round(R * c / 1000 * 1000) /1000;
        return d;
    }
    function getDistanceInKmOnSameLatitude(start, end){
        var sourceProj = map.getView().getProjection();
        var c1 = ol.proj.transform(start, sourceProj, 'EPSG:4326');
        var c2 = ol.proj.transform(end, sourceProj, 'EPSG:4326');
        var R = 6371e3; // metres

        var f1 = degreesToRadians(c1[1]);
        var f2 = degreesToRadians(c2[1]);
        var dl = degreesToRadians(c2[0]-c1[0]);


        var a = Math.cos(f1) * Math.cos(f2) * Math.sin(dl/2) * Math.sin(dl/2);


        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        var d = Math.round(R * c / 1000 * 1000) /1000;
        return d;
    }
    // var calculateRadius = function(center, end){
    //     var a = Math.abs(center[0] - end[0]);
    //     var b = Math.abs(center[1] - end[1]);
    //     var radius = Math.sqrt(a*a + b*b);
    //     return radius;
    // };
    //
    // window.calculateRadius = calculateRadius;

    function reverseCoordinates(coordinates){
        var tmpList = [];
        var tmpListTwo = [];
        for (var i = 0; i < coordinates.length; i++){
            tmpListTwo = [];
            tmpListTwo.push(coordinates[i+1]);
            tmpListTwo.push(coordinates[i]);
            tmpList.push(tmpListTwo);
        }
        return tmpList;
    }

    function getRadius(start, radiusKm){
        var sourceProj = map.getView().getProjection();
        var oneDegreeInKM = 111.111 * Math.cos(degreesToRadians(start[1]));
        var degreesDiff = radiusKm / oneDegreeInKM;

        var center = ol.proj.transform(start, 'EPSG:4326', sourceProj);
        var secondPoint = ol.proj.transform([start[0]+degreesDiff, start[1]], 'EPSG:4326', sourceProj);
        return Math.abs(center[0]-secondPoint[0]);
    }

    function showRadius(){
        $('#draw_information_radius').show();
        $('#mouse_coordinates').hide();
    }

    function hideRadius(){
        $('#draw_information_radius').hide();
        $('#mouse_coordinates').show();
        $('#draw_information_radius').empty();
    }
    function refreshRadiusValue(radius){
        $('#draw_information_radius').html("Radius: "+radius+"km");
    }

    function addInstruction(action, isFirstpoint){
        $("#draw_information").show();
        switch(action){
            case "rectangle":

                if(isFirstpoint === true){
                    $("#draw_information").html("Please add first rectangle point");
                }
                else{
                    $("#draw_information").html("Please add last rectangle point");
                }

                break;
            case "polygon":

                if(isFirstpoint === true){
                    $("#draw_information").html("Please add polygon point");
                }
                else{
                    $("#draw_information").html("To close the shape, click the starting point, or click twice in the same place");
                }

                break;
            case "centerPoint":
                if(isFirstpoint === true){
                    $("#draw_information").html("Please add center point");
                }
                else{
                    $("#draw_information").html("Please move mouse in order to adjust radius");
                }

                break;
            default:
                removeInstruction();
                break;
        }

    }
    function clearLayerSelection(){
        var mapLayers = getLayerList(map);
        var layersList = $('#map_layers .map_layers_layer');
        for(var i=0; i<mapLayers.length; i++) {
            if(mapLayers[i] instanceof ol.layer.Vector && mapLayers[i].get('isBlocked') !== true){
                mapLayers[i].getSource().getFeatures()[0].setStyle(normalStyle);
                mapLayers[i].setZIndex(1);
                mapLayers[i].getSource().getFeatures()[0].set('isActive', false);
            }
        }
        $(layersList).each(function(){
            $(this).removeClass('active');
        });

    }

    function removeInstruction(){
        $("#draw_information").empty();
        $("#draw_information").hide();
    }


    function decimalToDms(lat, lon){

        var latLetter = '';
        var lonLetter = '';

        var degreesLat = 0;
        var minutesLat = 0;
        var secondsLat = 0;
        var tenthsLat = 0;

        var degreesLon = 0;
        var minutesLon = 0;
        var secondsLon = 0;
        var tenthsLon = 0;
        lat = parseFloat(lat);
        lon = parseFloat(lon);
        if(lat !== 0){
            if (lat > 0){
                latLetter = 'N';
            }
            else{
                latLetter = 'S';
            }
            lat = Math.abs(lat);
            degreesLat = Math.trunc(lat);
            minutesLat = (lat - Math.floor(lat)) * 60.0;
            secondsLat = (minutesLat - Math.floor(minutesLat)) * 60.0;
            tenthsLat = (secondsLat - Math.floor(secondsLat)) * 10.0;

            minutesLat = Math.floor(minutesLat);
            secondsLat = Math.floor(secondsLat);
            tenthsLat = Math.floor(tenthsLat);
        }

        if(lon !== 0){
            if (lon > 0){
                lonLetter = 'E';
            }
            else{
                lonLetter = 'W';
            }
            lon = Math.abs(lon);
            degreesLon = Math.trunc(lon);
            minutesLon = (lon - Math.floor(lon)) * 60.0;
            secondsLon = (minutesLon - Math.floor(minutesLon)) * 60.0;
            tenthsLon = (secondsLon - Math.floor(secondsLon)) * 10.0;


            minutesLon = Math.floor(minutesLon);
            secondsLon = Math.floor(secondsLon);
            tenthsLon = Math.floor(tenthsLon);
        }



        return [[degreesLat,minutesLat,secondsLat,tenthsLat,latLetter],[degreesLon,minutesLon,secondsLon,tenthsLon,lonLetter]];
    }

    function dmsToDecimal(lat, lon){

        var degreesLat = parseInt(lat[0]);
        var minutesLat = parseInt(lat[1]);
        var secondsLat = parseInt(lat[2]);
        var tenthsLat = parseInt(lat[3]);

        var degreesLon = parseInt(lon[0]);
        var minutesLon = parseInt(lon[1]);
        var secondsLon = parseInt(lon[2]);
        var tenthsLon = parseInt(lon[3]);

        var latLetter = lat[4];
        var lonLetter = lon[4];

        var decimalLat = degreesLat+(minutesLat*60 + secondsLat + tenthsLat/10)/3600;
        if(latLetter === 'S'){
            decimalLat = decimalLat*(-1);
        }

        var decimalLon = degreesLon+(minutesLon*60 + secondsLon + tenthsLon/10)/3600;
        if(lonLetter === 'W'){
            decimalLon = decimalLon*(-1);
        }

        return [parseFloat(decimalLat.toFixed(4)), parseFloat(decimalLon.toFixed(4))];
    }

    function convertInputsDecimalToDMS(){
        var rectangles = $('#coordinates_content .rect_form');
        var circles = $('#coordinates_content .center_point_form');
        var polygons = $('#coordinates_content .poly_form');

        $(rectangles).each(function(){
            var upper_left_lat = $(this).find('.upper_left_lat');
            var upper_left_lon = $(this).find('.upper_left_lon');
            var lower_right_lat = $(this).find('.lower_right_lat');
            var lower_right_lon = $(this).find('.lower_right_lon');
            var upper_left_lat_valid = upper_left_lat.valid();
            var upper_left_lon_valid = upper_left_lon.valid();
            var lower_right_lat_valid = lower_right_lat.valid();
            var lower_right_lon_valid = lower_right_lon.valid();

            $(this).addClass('dms');

            if (upper_left_lat_valid && upper_left_lon_valid) {
                var firstPointDMS = decimalToDms(upper_left_lat.val(), upper_left_lon.val());
                $(this).find('.upper_left_lat').val(firstPointDMS[0][0] + "*" +firstPointDMS[0][1] + "\'" +firstPointDMS[0][2] + "." +firstPointDMS[0][3]+"\""+firstPointDMS[0][4]);
                $(this).find('.upper_left_lon').val(firstPointDMS[1][0] + "*" +firstPointDMS[1][1] + "\'" +firstPointDMS[1][2] + "." +firstPointDMS[1][3]+"\""+firstPointDMS[1][4]);
            }

            if(lower_right_lat_valid && lower_right_lon_valid) {
                var secondPointDMS = decimalToDms(lower_right_lat.val(), lower_right_lon.val());
                $(this).find('.lower_right_lat').val(secondPointDMS[0][0] + "*" + secondPointDMS[0][1] + "\'" + secondPointDMS[0][2] + "." + secondPointDMS[0][3] + "\"" + secondPointDMS[0][4]);
                $(this).find('.lower_right_lon').val(secondPointDMS[1][0] + "*" + secondPointDMS[1][1] + "\'" + secondPointDMS[1][2] + "." + secondPointDMS[1][3] + "\"" + secondPointDMS[1][4]);
            }

            upper_left_lat.valid();
            upper_left_lon.valid();
            lower_right_lat.valid();
            lower_right_lon.valid();
        });

        $(polygons).each(function(){
            $(this).addClass('dms');

            var textarea = $(this).find('.points');

            var textareaPoints = cleanCoords($(textarea).val());

            var finalPoints = [];
            var point = [];
            for(var i = 0; i < textareaPoints.length-1; i=i+2){
                point = decimalToDms(textareaPoints[i], textareaPoints[i+1]);
                finalPoints.push(point[0][0] + "*" +point[0][1] + "\'" +point[0][2] + "." +point[0][3]+"\""+point[0][4]);
                finalPoints.push(point[1][0] + "*" +point[1][1] + "\'" +point[1][2] + "." +point[1][3]+"\""+point[1][4]);
            }
            $(textarea).val(breakingCoords(splitPairs(finalPoints)));
            textarea.valid();
        });

        $(circles).each(function(){
            var lat = $(this).find('.center_lat');
            var lon = $(this).find('.center_lon');
            var lat_valid = lat.valid();
            var lon_valid = lon.valid();

            $(this).addClass('dms');

            if (lat_valid && lon_valid) {
                var point = decimalToDms($(lat).val(), $(lon).val());
                $(lat).val(point[0][0] + "*" +point[0][1] + "\'" +point[0][2] + "." +point[0][3]+"\""+point[0][4]);
                $(lon).val(point[1][0] + "*" +point[1][1] + "\'" +point[0][2] + "." +point[1][3]+"\""+point[1][4]);
            }

            lat.valid();
            lon.valid();
        });
    }

    function convertInputsDmsToDecimal(){
        var rectangles = $('#coordinates_content .rect_form');
        var circles = $('#coordinates_content .center_point_form');
        var polygons = $('#coordinates_content .poly_form');

        $(rectangles).each(function(){
            var upper_left_lat = $(this).find('.upper_left_lat');
            var upper_left_lon = $(this).find('.upper_left_lon');
            var lower_right_lat = $(this).find('.lower_right_lat');
            var lower_right_lon = $(this).find('.lower_right_lon');
            var upper_left_lat_valid = upper_left_lat.valid();
            var upper_left_lon_valid = upper_left_lon.valid();
            var lower_right_lat_valid = lower_right_lat.valid();
            var lower_right_lon_valid = lower_right_lon.valid();

            $(this).removeClass('dms');

            if (upper_left_lat_valid && upper_left_lon_valid) {
                var firstPointDecimal = dmsToDecimal(parseDMS(upper_left_lat.val()), parseDMS(upper_left_lon.val()));
                $(this).find('.upper_left_lat').val(firstPointDecimal[0]);
                $(this).find('.upper_left_lon').val(firstPointDecimal[1]);
            }

            if (lower_right_lat_valid && lower_right_lon_valid) {
                var secondPointDecimal = dmsToDecimal(parseDMS(lower_right_lat.val()), parseDMS(lower_right_lon.val()));
                $(this).find('.lower_right_lat').val(secondPointDecimal[0]);
                $(this).find('.lower_right_lon').val(secondPointDecimal[1]);
            }

            upper_left_lat.valid();
            upper_left_lon.valid();
            lower_right_lat.valid();
            lower_right_lon.valid();
        });

        $(polygons).each(function(){
            var textarea = $(this).find('.points');

            var textareaPoints = cleanCoords($(textarea).val());

            var finalPoints = [];
            var point = [];
            for(var i = 0; i < textareaPoints.length-1; i=i+2){
                point = dmsToDecimal(parseDMS(textareaPoints[i]), parseDMS(textareaPoints[i+1]));
                finalPoints.push(point[0]);
                finalPoints.push(point[1]);
            }
            $(textarea).val(breakingCoords(splitPairs(finalPoints)));
            $(this).removeClass('dms');
            textarea.valid();
        });

        $(circles).each(function(){
            var lat = $(this).find('.center_lat');
            var lon = $(this).find('.center_lon');
            var lat_valid = lat.valid();
            var lon_valid = lon.valid();

            $(this).removeClass('dms');

            if (lat_valid && lon_valid) {
                var point = dmsToDecimal(parseDMS($(lat).val()), parseDMS($(lon).val()));
                $(lat).val(point[0]);
                $(lon).val(point[1]);
            }

            lat.valid();
            lon.valid();
        });
    }
    function parseDMS(dms){
        //clear white spaces
        dms = dms.replace(/ /g,'');
        var degrees = dms.split('*')[0];
        var minutes = 0;
        var hasMinutes = dms.indexOf('\'') > 0;
        if (hasMinutes) {
            minutes = dms.split('*')[1].split('\'')[0];
        }
        var seconds = 0;
        var hasSeconds = hasMinutes && dms.indexOf('\"') > 0;
        if (hasSeconds) {
            seconds = dms.split('*')[1].split('\'')[1].split('.')[0];
        }
        var tenths = 0;
        var hasTenths = dms.indexOf('.') > 0;
        if (hasTenths) {
            if(dms.split('*') === undefined) { tenths = dms.split('*')[1].split('\'')[1].split('.')[1].split('\"')[0]; }
        }
        var letter = dms[dms.length-1];;

        return [degrees,minutes,seconds,tenths,letter];
    }

    //Validators
    function validateLayerName(id, newName){
        var layerList = getLayerList(map);
        if(newName === ""){
            return false;
        }
        for(var i = 0; i < layerList.length ; i++){
            if(parseFloat(layerList[i].get("id")) !== parseFloat(id) && layerList[i].get("name") === newName){
                return false;
            }
        }
        return true;
    }

    window.validateLayerName = validateLayerName;

    function modifyLayerName(shape, id, newName){

        var editForm = $("#"+shape+"_"+id).find("input.name");
        var mapForm = $("#"+shape+"_"+id+"_map_list").find('.map_layers_name span');
        var layer = getLayerById(id);

        $(editForm).val(newName);
        $(mapForm).html(newName);
        layer.set('name', newName);
        layer.getSource().getFeatures()[0].set('name', newName);
    }


    function validateLayerPriority(id, newPriority){
        newPriority = parseInt(newPriority);

        if(isNaN(newPriority) || newPriority < 1 || newPriority > 100){
            return false;
        }

        return true;
    }

    window.validateLayerPriority = validateLayerPriority;

    function modifyLayerPriority(shape, id, newPriority){
        var editForm = $("#"+shape+"_"+id).find("input.priority");
        var mapForm = $("#"+shape+"_"+id+"_map_list").find('.map_layers_priority span');
        var layer = getLayerById(id) ;

        $(editForm).val(newPriority);
        $(mapForm).html(newPriority);
        layer.set('priority', newPriority);
        layer.getSource().getFeatures()[0].set('priority', newPriority);
    }


    function modifyMapListPriority(layerForm){
        var map_layers_priority = $(layerForm).find('.map_layers_priority');
        var map_layers_name = $(layerForm).find('.map_layers_name');
        /*var map_layers_edit = $(layerForm).find('.map_layers_edit img');*/

        var layerToEdit = $(layerForm).attr('id').split('_map_list')[0];
        var shape = layerToEdit.split('_')[0];
        var layer_id = layerToEdit.split("_")[1];

        var priority = $(map_layers_priority).find('input').val();

        var prioritySpan = $(map_layers_priority).find("span");
        var nameSpan = $(map_layers_name).find("span");

        var priorityInput = $(map_layers_priority).find("input");
        var nameInput = $(map_layers_name).find("input");

        var valid = validateLayerPriority(layer_id, priority);

        if(valid === true){
            modifyLayerPriority(shape, layer_id, priority);

            $(prioritySpan).show();
            $(priorityInput).hide();
            $(prioritySpan).html(priority);

            $(nameSpan).show();
            $(nameInput).hide();
        }
        else{
            $(prioritySpan).show();
            $(priorityInput).hide();

            $(nameSpan).show();
            $(nameInput).hide();

            $(map_layers_priority).find(".error_message").show();
        }
        /*$(map_layers_edit).html("edit");*/
        $(map_layers_name).removeClass("editing");
        $(map_layers_priority).removeClass("editing");
    }

    function modifyMapListName(layerForm){

        var map_layers_priority = $(layerForm).find('.map_layers_priority');
        var map_layers_name = $(layerForm).find('.map_layers_name');
        /*var map_layers_edit = $(layerForm).find('.map_layers_edit img');*/

        var layerToEdit = $(layerForm).attr('id').split('_map_list')[0];
        var shape = layerToEdit.split('_')[0];
        var layer_id = layerToEdit.split("_")[1];

        var name = $(map_layers_name).find('input').val();

        var prioritySpan = $(map_layers_priority).find("span");
        var nameSpan = $(map_layers_name).find("span");

        var priorityInput = $(map_layers_priority).find("input");
        var nameInput = $(map_layers_name).find("input");

        var valid = validateLayerName(layer_id, name);

        if(valid === true){
            modifyLayerName(shape, layer_id, name);

            $(prioritySpan).show();
            $(priorityInput).hide();

            $(nameSpan).show();
            $(nameInput).hide();
            $(nameSpan).html(name);
        }
        else{
            $(prioritySpan).show();
            $(priorityInput).hide();

            $(nameSpan).show();
            $(nameInput).hide();

            $(map_layers_name).find(".error_message").show();
        }
        /*$(map_layers_edit).html("edit");*/
        $(map_layers_name).removeClass("editing");
        $(map_layers_priority).removeClass("editing");

    }

    function addBlockedKMLFromURL(urlToFile){
        $.ajax({
            type:    "GET",
            url:     urlToFile,
            success: function(xml) {
                var polygons = $(xml).find("Polygon");
                $(polygons).each(function(){
                    var layerCoordsHTML = $(this).find("coordinates").get(0);
                    var layerCoordsArray = $(layerCoordsHTML).text().split(" ");
                    var layerCoordsList = [];
                    var tmpList = [];
                    for(var i = 0; i < layerCoordsArray.length; i++){
                        tmpList = layerCoordsArray[i].split(",");
                        layerCoordsList.push(tmpList[1]);
                        layerCoordsList.push(tmpList[0]);
                    }
                    var polygonName= "polygon_"+getNewLayerId();
                    addPolygoBlocked(layerCoordsList);
                });
                fitMapToExtent();
            }
        });
    }


    function areaPolygons(polygons){
        var area = 0
        for(var i = 0; i < polygons.length; i++  ){
            area += areaPolygon(polygons[i]);
        }
        return (Math.round(area * 100) / 100);
    }

    function areaPolygon(polygon) {
        var area;
        var sourceProj = map.getView().getProjection();
        var geom = /** @type {ol.geom.Polygon} */(polygon.clone().transform(sourceProj, 'EPSG:4326'));
        var coordinates = geom.getLinearRing(0).getCoordinates();
        area = Math.abs(wgs84Sphere.geodesicArea(coordinates));

        return (Math.round(area / 1000000 * 100) / 100);
    }

    function areaCircle(circle) {
        var area;
        var sourceProj = map.getView().getProjection();
        var geom = /** @type {ol.geom.Polygon} */(circle.clone().transform(sourceProj, 'EPSG:4326'));
        var extent = geom.getExtent();
        area = (2/Math.PI)* Math.abs(wgs84Sphere.geodesicArea(ol.geom.Polygon.fromExtent(extent)));
        return (Math.round((2/Math.PI)*area / 1000000 * 100) / 100);
    }

    /*
     function getAreaSurface(map) {
     var reader = new jsts.io.WKTReader();
     var area = 0;
     var layers = getLayerList(map);

     var parser = new jsts.io.OL3Parser();

     var resultGeom = null;
     for(var i = 0; i < layers.length; i++){

     if(layers[i] instanceof ol.layer.Vector){
     var geom = layers[i].getSource().getFeatures()[0].getGeometry();

     if(geom instanceof ol.geom.Polygon){
     if(resultGeom === null){
     resultGeom = parser.read(geom);
     }
     else{
     var jstsGeom = parser.read(geom);
     resultGeom = resultGeom.union(jstsGeom);
     }
     }
     else if(geom instanceof ol.geom.MultiPolygon){
     if(resultGeom === null){
     resultGeom = parser.read(geom.getPolygon(0));
     }
     else{
     var jstsGeom = parser.read(geom.getPolygon(0));
     resultGeom = resultGeom.union(jstsGeom);
     }
     }
     else if(geom instanceof ol.geom.Circle){
     if(resultGeom === null){
     resultGeom = parser.read(ol.geom.Polygon.fromCircle(geom));
     }
     else{
     var jstsGeom = parser.read(ol.geom.Polygon.fromCircle(geom));
     resultGeom = resultGeom.union(jstsGeom);
     }
     }
     }
     }
     var resultGeomOL = parser.write(resultGeom);

     if(resultGeomOL instanceof ol.geom.Polygon){
     return areaPolygon(resultGeomOL);
     }
     else{
     return areaPolygons(resultGeomOL.getPolygons());
     }
     }
     */

    function changeMapToBing(){

        map.getLayers().getArray()[0].set('visible', true);
        map.getLayers().getArray()[1].set('visible', false);

        //disable all google annotations
        $("#map_place_gm > div > div:nth-child(9), #map_place_gm > div > div.gmnoprint.gm-style-cc, #map_place_gm > div > div:nth-child(4), #map_place_gm > div > div:nth-child(2)").css( "display", "none" );

        //disable the openlayers icon
        $("#map_place > div > div.ol-overlaycontainer-stopevent > div.ol-attribution.ol-unselectable.ol-control.ol-uncollapsible > ul > li:nth-child(1) > a").css( "display", "none" );

    }
    function changeMapToGoogleMaps(){
        map.getLayers().getArray()[0].set('visible', false);
        map.getLayers().getArray()[1].set('visible', false);

        //show all google annotations
        $("#map_place_gm > div > div:nth-child(9), #map_place_gm > div > div.gmnoprint.gm-style-cc, #map_place_gm > div > div:nth-child(4), #map_place_gm > div > div:nth-child(2)").css( "display", "block" );

    }
    function changeMapToOsm(){
        map.getLayers().getArray()[0].set('visible', false);
        map.getLayers().getArray()[1].set('visible', true);

        //disable all google annotations
        $("#map_place_gm > div > div:nth-child(9), #map_place_gm > div > div.gmnoprint.gm-style-cc, #map_place_gm > div > div:nth-child(4), #map_place_gm > div > div:nth-child(2)").css( "display", "none" );

        //show the openlayers icon
        $("#map_place > div > div.ol-overlaycontainer-stopevent > div.ol-attribution.ol-unselectable.ol-control.ol-uncollapsible > ul > li:nth-child(1) > a").css( "display", "inline" );

    }

    function longitudeModulo(long){
        var longParsed = parseFloat(long);
        if(longParsed >= 180){
            longParsed = ((longParsed+180)%360)-180;
        }
        else if(longParsed <= -180){
            longParsed = ((longParsed-180)%360)+180;
        } else {
            // had to add because it is CRITICAL issue
        }
        return longParsed;
    }

    //function getMinRectangle(startPoint, endPoint){

    //	funkcja ma zwaracać początek i koniec najmniejszego prostokąta dla podanych współrzędnych
    //	w tym momencie funkcja nie działa. Jej zamysłem jest zmiana współrzędnych ponad 180 stopni i poniżej -180 stopni, a policzenie powierzchi powstałego kształtu,
    //	a następnie porównanie tej powierzchni z bazowymi koordynatami.
    //	Problem jest tylko z wyborem które współrzędne należy przenieść. Polecam rozrysować sobie problem na kartce.
    //	Mi niestety nie starczyło już czasu.
    //
    //	Pwodzenia @Kamyk
    /*
     if(Math.abs(startPoint[0]-endPoint[0]) < 180 ){
     return [startPoint, endPoint];
     }
     startPoint = [longitudeModulo(parseFloat(startPoint[0])),parseFloat(startPoint[1])];
     endPoint = [longitudeModulo(parseFloat(endPoint[0])),parseFloat(endPoint[1])];
     var normalCoords = [[[startPoint, [startPoint[0], endPoint[1]], endPoint, [endPoint[0], startPoint[1]], startPoint]]];
     */
    //var endPoint2 = [parseFloat(endPoint[0]), parseFloat(endPoint[1])];
    //
    //if(endPoint2[0] > 0){
    //	endPoint2[0] = -1*((180-endPoint2[0])+180);
    //}
    //else{
    //	endPoint2[0] = -1*((180+endPoint2[0])+180);
    //}
    //var twoHemisphereCoords = [[[startPoint, [startPoint[0], endPoint2[1]], endPoint2, [endPoint2[0], startPoint[1]], startPoint]]];

    //var areaNormal = wgs84Sphere.geodesicArea(normalCoords);
    //var areaTwoHemisphere = wgs84Sphere.geodesicArea(twoHemisphereCoords);

    //if(areaNormal > areaTwoHemisphere){
    //	return [startPoint, endPoint2];
    //}
    //else{
    //	return [startPoint, endPoint];
    //}


    //}

    function getMinimumRectangleCords(points){
        var startPoint = [parseFloat(points[0][0]),parseFloat(points[0][1])];
        var endPoint = [parseFloat(points[1][0]),parseFloat(points[1][1])];

        if(Math.abs(startPoint[0] - endPoint[0]) > 180){
            if(startPoint[0] < 0){
                startPoint[0] += 360;
            }
            if(endPoint[0] < 0){
                endPoint[0] += 360;
            }
        }
        return [startPoint, endPoint];
    }
    function getMinimumPolygonCords(points){
        if(getMaxLongnitudeDifference(points) > 180){
            var tmp = 0;
            for(var i = 0; i < points.length; i++){
                tmp = parseFloat(points[i][0]);
                if(tmp < 0){
                    points[i][0] = tmp + 360;
                }
            }
        }

        return points;
    }
    function getMaxLongnitudeDifference(points){
        var smallestLong = parseFloat(points[0][0]);
        var biggestLong = smallestLong;
        for(var i = 1; i < points.length; i++){
            if(parseFloat(points[i][0]) < smallestLong){
                smallestLong = parseFloat(points[i][0]);
            }
            if(parseFloat(points[i][0]) > biggestLong){
                biggestLong = parseFloat(points[i][0]);
            }
        }
        return Math.abs(smallestLong - biggestLong);
    }
    function removeInteraction(interactionType){
        /*
         supported interaction types: draw, select, modify
         */
        var interactions = map.getInteractions().getArray();
        for(var i = 0; i < interactions.length; i++){
            if(interactionType === "draw"){
                if(interactions[i] instanceof ol.interaction.Draw){
                    map.removeInteraction(interactions[i]);
                }
            }
            else if(interactionType === "select"){
                if(interactions[i] instanceof ol.interaction.Select){
                    map.removeInteraction(interactions[i]);
                }
            }
            else if(interactionType === "modify"){
                if(interactions[i] instanceof ol.interaction.Modify || interactions[i] instanceof ol.interaction.ModifyRectangle || interactions[i] instanceof ol.interaction.ModifyCircle ){
                    map.removeInteraction(interactions[i]);
                }
            } else {
                // had to add because it is CRITICAL issue
            }
        }
    }

    function cleanCoords(coordsStr) {
        return coordsStr.replace(/ /g,'').split(/[,\n]+/);
    }

    function breakingCoords(coordsArr) {
        return coordsArr.join('\n').replace(/,/g, ', ');
    }

    exportedMap = map;

  function retrieveAndCheckCoordinatesData() {
    var polyCoords = [];
    var rectCoords = [];
    var circleCoords = [];
    var allValid = true;

    $('#coordinates_content').find('form>div').each(function() {
      if($(this).hasClass('poly_form')) {
        if($(this).find('input.priority').valid() &&
          $(this).find('input.name').valid() &&
          $(this).find('textarea.points').valid()) {

          var textarea = $(this).find('.points');
          var textareaPoints = cleanCoords($(textarea).val());
          var finalPoints = [];

          if ($('#dms_radio:checked').length === 1) {
            var point;

            for(var i = 0; i < textareaPoints.length-1; i=i+2){
              point = dmsToDecimal(parseDMS(textareaPoints[i]), parseDMS(textareaPoints[i+1]));
              finalPoints.push(point[0]);
              finalPoints.push(point[1]);
            }
          }
          else {
            finalPoints = textareaPoints;
          }

          polyCoords.push({
            "priority": $(this).find('input.priority').val(),
            "name": $(this).find('input.name').val(),
            "pointList": finalPoints.join(',')
          })
        } else {
          allValid = false;
          $(this).find('input.priority').valid();
          $(this).find('input.name').valid();
          $(this).find('textarea.points').valid();
        }
      }
      else if($(this).hasClass('rect_form')) {
        if($(this).find('input.lower_right_lat').valid() &&
          $(this).find('input.lower_right_lon').valid() &&
          $(this).find('input.name').valid() &&
          $(this).find('input.priority').valid() &&
          $(this).find('input.upper_left_lat').valid() &&
          $(this).find('input.upper_left_lon').valid()) {

          var upper_left_lat = $(this).find('.upper_left_lat');
          var upper_left_lon = $(this).find('.upper_left_lon');
          var lower_right_lat = $(this).find('.lower_right_lat');
          var lower_right_lon = $(this).find('.lower_right_lon');

          if ($('#dms_radio:checked').length === 1) {
            var firstPointDecimal = dmsToDecimal(parseDMS(upper_left_lat.val()), parseDMS(upper_left_lon.val()));
            var secondPointDecimal = dmsToDecimal(parseDMS(lower_right_lat.val()), parseDMS(lower_right_lon.val()));

            rectCoords.push({
              "lowerRight": {
                "latitudeAsCoordinate": {
                  "decimal": secondPointDecimal[0]
                },
                "longitudeAsCoordinate": {
                  "decimal": secondPointDecimal[1]
                }
              },
              "name": $(this).find('input.name').val(),
              "priority": $(this).find('input.priority').val(),
              "upperLeft": {
                "latitudeAsCoordinate": {
                  "decimal": firstPointDecimal[0]
                },
                "longitudeAsCoordinate": {
                  "decimal": firstPointDecimal[1]
                }
              }
            })
          }
          else {
            rectCoords.push({
              "lowerRight": {
                "latitudeAsCoordinate": {
                  "decimal": lower_right_lat.val()
                },
                "longitudeAsCoordinate": {
                  "decimal": lower_right_lon.val()
                }
              },
              "name": $(this).find('input.name').val(),
              "priority": $(this).find('input.priority').val(),
              "upperLeft": {
                "latitudeAsCoordinate": {
                  "decimal": upper_left_lat.val()
                },
                "longitudeAsCoordinate": {
                  "decimal": upper_left_lon.val()
                }
              }
            })
          }

        } else {
          allValid = false;
          $(this).find('input.lower_right_lat').valid();
          $(this).find('input.lower_right_lon').valid();
          $(this).find('input.name').valid();
          $(this).find('input.priority').valid();
          $(this).find('input.upper_left_lat').valid();
          $(this).find('input.upper_left_lon').valid();
        }
      }
      else if($(this).hasClass('center_point_form')) {
        if($(this).find('input.priority').valid() &&
          $(this).find('input.name').valid() &&
          $(this).find('input.center_lat').valid() &&
          $(this).find('input.center_lon').valid() &&
          $(this).find('input.radius').valid()) {

          var lat = $(this).find('.center_lat');
          var lon = $(this).find('.center_lon');

          if ($('#dms_radio:checked').length === 1) {

            var circlePoint = dmsToDecimal(parseDMS($(lat).val()), parseDMS($(lon).val()));

            circleCoords.push({
              "priority": $(this).find('input.priority').val(),
              "name": $(this).find('input.name').val(),
              "center": {
                "latitudeAsCoordinate": {"decimal": circlePoint[0]},
                "longitudeAsCoordinate": {"decimal": circlePoint[1]}
              },
              "radius": $(this).find('input.radius').val()
            });
          }
          else {
            circleCoords.push({
              "priority": $(this).find('input.priority').val(),
              "name": $(this).find('input.name').val(),
              "center": {
                "latitudeAsCoordinate": {"decimal": lat.val()},
                "longitudeAsCoordinate": {"decimal": lon.val()}
              },
              "radius": $(this).find('input.radius').val()
            });
          }

        } else {
          allValid = false;
          $(this).find('input.priority').valid();
          $(this).find('input.name').valid();
          $(this).find('input.center_lat').valid();
          $(this).find('input.center_lon').valid();
          $(this).find('input.radius').valid();
        }
      } else {
        // had to add because it is CRITICAL issue
      }
    });
    return {
      allValid: allValid,
      polyCoords: polyCoords,
      rectCoords: rectCoords[0],
      circleCoords: circleCoords
    }
  }
}

function getExportedMap() {
    return exportedMap;
}

function removeAllFigures() {
    $('#coordinates_content .delete_button').trigger('click');
}

function removeAllLayers() {
    var mapLayers = exportedMap.getLayers().getArray();
    exportedMap.setLayerGroup(new ol.layer.Group());
    exportedMap.addLayer(mapLayers[0]);
    exportedMap.addLayer(mapLayers[1]);
}

function removeLayer(name) {
    var mapLayers = exportedMap.getLayers().getArray();
    for(var i=2; i < mapLayers.length; i++ ) {
        if(name === mapLayers[i].get('name')) {
            exportedMap.removeLayer(mapLayers[i]);
        }
    }
}

module.exports.init = init;module.exports.map = getExportedMap;
module.exports.removeAllLayers = removeAllLayers;
module.exports.removeAllFigures = removeAllFigures;
module.exports.removeLayer = removeLayer;
