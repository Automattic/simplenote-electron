import { Client } from 'simperium'
import Promise from 'promise'

export default function configure(database, version, config) {

	Client.Bucket.prototype.query = function(fn) {
		(new Promise(function(resolve, reject) {
			reject('lol');
		})).then(fn);

	};

	return new Store(database, version, config);

}


function Store(database, version, config){

}