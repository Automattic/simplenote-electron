module.exports = {
	noteTitleAndPreview: function(note) {
    var content = (note && note.data && note.data.content || "").trim();
    var firstLineBreak = content.indexOf("\n");

    if (firstLineBreak == -1) firstLineBreak = content.length;
    var title = content.slice(0, Math.min(200, firstLineBreak));

    if (firstLineBreak >= 0) {
      var preview = content.slice(firstLineBreak+1, firstLineBreak + 100);      
    }

		return {title: title, preview: preview};
	}
};