var path = require( 'path' );
var express = require( 'express' );
var webpack = require( 'webpack' );
var config = require( './webpack.config.hot' );

var app = express();
var compiler = webpack( config );

app.use( require( 'webpack-dev-middleware' )( compiler, {
	noInfo: true,
	publicPath: config.output.publicPath
} ) );

app.use( require( 'webpack-hot-middleware' )( compiler ) );

app.get( '*', function( req, res ) {
	res.set( 'Content-Type', 'text/html' );
	res.send( compiler.outputFileSystem.readFileSync( path.join( __dirname, 'dist', 'index.html' ) ) );
} );

app.listen( 4000, '0.0.0.0', function( err ) {
	if ( err ) {
		console.log( err );
		return;
	}

	console.log( 'Listening at http://localhost:4000' );
} );
