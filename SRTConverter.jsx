function trim(str) {
    return str.replace(/^\s+|\s+$/g, '');
}

function srtToJson(srtContent) {
    var lines = trim(srtContent).split('\n');
    var result = [];
    var currentEntry = [];

    for (var i = 0; i < lines.length; i++) {
        var line = trim(lines[i]);
        if (line === '') {
            if (currentEntry.length === 3) {
                var index = currentEntry[0];
                var timeRange = currentEntry[1];
                var text = currentEntry[2];
                var timeParts = timeRange.split(' --> ');
                var startTime = timeParts[0].replace(',', '.');
                var endTime = timeParts[1].replace(',', '.');

                result.push([text, startTime, endTime]);
            }
            currentEntry = [];
        } else {
            currentEntry.push(line);
        }
    }

    if (currentEntry.length === 3) {
        var index = currentEntry[0];
        var timeRange = currentEntry[1];
        var text = currentEntry[2];
        var timeParts = timeRange.split(' --> ');
        var startTime = timeParts[0].replace(',', '.');
        var endTime = timeParts[1].replace(',', '.');

        result.push([text, startTime, endTime]);
    }

    return result;
}

// Get SRT file content using file picker
var srtFile = File.openDialog("Select a .srt file", "*.srt");

if (srtFile) {
    srtFile.open("r");
    var srtContent = srtFile.read();
    srtFile.close();

    var subtitlesData = srtToJson(srtContent);
    main(subtitlesData);
} else {
    alert("No file selected.");
}

// Output JSX script content
function main(subtitlesData) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Please select a composition first.");
        return;
    }

    if (comp.selectedLayers.length === 0) {
        alert("Please select a text layer as template.");
        return;
    }

    var selectedLayer = comp.selectedLayers[0];
    if (!selectedLayer.property("Source Text")) {
        alert("Please select a text layer as template.");
        return;
    }

    // Subtitle Data (from SRT)
    createSubtitlesLayer(comp, selectedLayer, subtitlesData);
}

/**
 * Create Subtitles Layer
 * @param {CompItem} comp - Current composition
 * @param {Layer} templateLayer - Template layer
 * @param {Array} subtitlesData - Data for subtitles
 */
function createSubtitlesLayer(comp, templateLayer, subtitlesData) {
    app.beginUndoGroup("Generate Subtitles Layers");

    var templateTextProp = templateLayer.property("Source Text").value;

    // Create a new text layer for subtitles
    var subtitleLayer = comp.layers.addText("");
    subtitleLayer.name = "generated_subtitles";
    var subtitleTextProp = subtitleLayer.property("Source Text");

    // Copy the position from the template layer
    subtitleLayer.position.setValue(templateLayer.position.value);

    // Initialize the value for the subtitle text layer based on the template
    var subtitleTextValue = subtitleTextProp.value;
    subtitleTextValue.font = templateTextProp.font;
    subtitleTextValue.fontSize = templateTextProp.fontSize;
    subtitleTextValue.leading = templateTextProp.leading || templateTextProp.fontSize * 1.2;
    subtitleTextValue.justification = templateTextProp.justification;

    if (templateTextProp.applyFill) {
        subtitleTextValue.applyFill = true;
        subtitleTextValue.fillColor = templateTextProp.fillColor;
    } else {
        subtitleTextValue.applyFill = false;
    }

    if (templateTextProp.applyStroke) {
        subtitleTextValue.applyStroke = true;
        subtitleTextValue.strokeColor = templateTextProp.strokeColor;
        subtitleTextValue.strokeWidth = templateTextProp.strokeWidth;
    } else {
        subtitleTextValue.applyStroke = false;
    }

    for (var i = 0; i < subtitlesData.length; i++) {
        var subtitleText = subtitlesData[i][0];
        var startTime = parseTime(subtitlesData[i][1]);
        var endTime = parseTime(subtitlesData[i][2]);

        // Set the text content at the start time
        subtitleTextValue.text = subtitleText;
        subtitleTextProp.setValueAtTime(startTime, subtitleTextValue);

        // Set an empty text keyframe at the end time
        var emptyTextValue = subtitleTextValue;
        emptyTextValue.text = ""; // Empty text at the end time
        subtitleTextProp.setValueAtTime(endTime, emptyTextValue);
    }

    templateLayer.enabled = false;
    app.endUndoGroup();
    alert("Subtitles layers created.");
}

/**
 * Parse a time string in the format "hh:mm:ss.fff" to a number of seconds
 * @param {string} timeStr - Time in "hh:mm:ss.fff" format
 * @returns {number} - Time in seconds
 */
function parseTime(timeStr) {
    var parts = timeStr.split(":");
    var hours = parseFloat(parts[0]);
    var minutes = parseFloat(parts[1]);
    var seconds = parseFloat(parts[2]);

    return (hours * 3600) + (minutes * 60) + seconds;
}
