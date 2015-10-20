module.exports = {
	noteTitleAndPreview: function(note) {
    var content = (note && note.data && note.data.content || "").trim();
    var firstLineBreak = content.indexOf("\n");

    if (firstLineBreak == -1) firstLineBreak = content.length;
    var title = content.slice(0, Math.min(200, firstLineBreak));

		var lb = firstLineBreak, preview = "";
		while(preview == "" && lb !== -1) {
			var nlb = content.indexOf("\n", lb+1);
			var preview = content.slice(lb+1, nlb);
			console.log("Preview", preview);
			lb = nlb;
		}

		return {title: title, preview: preview};
	}
};