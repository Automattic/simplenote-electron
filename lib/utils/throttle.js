
var timers = {};

function timer( id ) {
	var t = timers[id];
	if ( !t ) timers[id] = { start: ( new Date() ).getTime(), id: -1 };
	return timers[id];
};

function clearTimer( id ) {
	delete timers[id];
}

export default function throttle( id, maxTime, cb ) {
	var t = timer( id ),
		now = ( new Date() ).getTime(),
		ellapsed = now - t.start;

	function perform() {
		//var t = timer( id ),
		//	now = ( new Date() ).getTime(),
		//	ellapsed = now - t.start;

		cb();
		clearTimer( id );
	};

	clearTimeout( timer.id );

	if ( ellapsed > maxTime ) return perform();

	timer.id = setTimeout( perform, maxTime );
}
