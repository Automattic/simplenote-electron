Analytics
=========

This module is a simplified version of the analytics module found in WP-Calypso.

Original: https://github.com/Automattic/wp-calypso/tree/master/client/analytics

## Tracks API

### analytics#tracks#recordEvent( eventName, eventProperties )

Record an event with optional properties:

```js
analytics.tracks.recordEvent( 'calypso_checkout_coupon_apply', {
	'coupon_code': 'abc123'
} );
```