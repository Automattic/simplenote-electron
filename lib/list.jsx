import React from 'react';

export default React.createClass( {

	getDefaultProps: function() {
		return {
			dataSource: null,
			onClickItem: function() {},
			renderItem: function( item, i ) {
				return (
					<div>
					<pre>{i} | {JSON.stringify( item )}</pre>
					</div>
				);
			}
		}
	},

	eachItem: function( fn ) {
		var dataSource = this.props.dataSource;
		if ( !dataSource ) {
			return;
		}
		let total = dataSource.totalItems();
		for ( let i = 0; i < total; i++ ) {
			fn( dataSource.getItem( i ), i );
		}
	},

	collect: function() {
		var items = [], renderItem = this.renderItem;

		this.eachItem( function() {
			items.push( renderItem.apply( null, arguments ) );
		} );
		return items;
	},

	onClickItemHandler: function( item, i ) {
		return () => {
			this.props.onClickItem( item, i );
		};
	},

	renderItem: function( item, i ) {
		return (
			<div key={i} onClick={this.onClickItemHandler( item, i )}>
				{this.props.renderItem( item, i )}
			</div>
		);
	},

	render: function() {
		return (
			<div>
				{this.collect()}
			</div>
		)
	}
} )
