var request=require('request');
var assert=require('assert');
var helloWorld = require("../index.js");
var base_url = "http://localhost:3000";

describe("user get request", function(){
	describe("GET / ", function(){
		it("returns status code 200", function(done){
			request.get(base_url, function(error, response, body){
				assert.equal(200, response.statusCode);
				done();	
			});
		});
	});
	describe("GET / ", function(){
		it("returns status code 200", function(done){
			request.get(base_url, function(error, response, body){
				assert.equal(200, response.statusCode);
				done();	
			});
		});
	});
});

describe("check string content", function(){
	describe("return 1 on string content", function(done){
		assert.contains("hello","ell");
	});
});