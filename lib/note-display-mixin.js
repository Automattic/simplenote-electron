export default {
	noteTitleAndPreview: function(note) {
		var content = (note && note.data && note.data.content || "").trim();
		var firstLineBreak = content.indexOf("\n");

		if (firstLineBreak == -1) firstLineBreak = content.length;
		var title = content.slice(0, Math.min(200, firstLineBreak));

		if (title === '') {
			title = 'New note...';
		}

		var lb = firstLineBreak, preview = "";
		while(preview == "" && lb !== -1) {
			var nlb = content.indexOf("\n", lb+1);
			var slice_end = nlb == -1 ? content.length : nlb;
			var preview = content.slice(lb+1, slice_end);
			lb = nlb;
		}
		return {title: title, preview: preview};
	}
};
