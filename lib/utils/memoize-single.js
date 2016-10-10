import {
	memoize,
} from 'lodash';

/**
 * Caches a single value and reference (key)
 */
export class SingleCache {
	delete() {
		return false;
	}

	get() {
		return this.value;
	}

	has( key ) {
		return key === this.key;
	}

	set( key, value ) {
		this.key = key;
		this.vale = value;

		return this;
	}
}

/**
 * Caches the most-recent invocation of a function
 *
 * Unlike a general memoizer, this does not attempt
 * to keep a dictionary of inputs and outputs. Instead
 * it stores the reference to the most-recently given
 * input and stores the output value.
 *
 * When called successively with the same input this
 * will return the identical output.
 *
 * When called with new or different input this will
 * recalculate and store the new values.
 *
 * There is no further memory wherein the worst-case
 * scenario (each function-call has differing input
 * from the previous call) is very similar in performance
 * and storage as the function without the memoization.
 *
 * Note that we `.bind()` here to clone this function
 * and prevent mangling the global lodash memoizer
 */
export const memoizeSingle = memoize.bind( null );
memoizeSingle.Cache = SingleCache;

export default memoizeSingle;
