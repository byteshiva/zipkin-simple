
var Request = require("request")

var HTTP_OK = 200
var HTTP_RECEIVED = 202
var TO_MILLISECONDS = 1000
var ID_LENGTH = 16
var ID_DIGITS = "0123456789abcdef"

var options = {
	host: "127.0.0.1",
	port: "9411",
	path: "/api/v1/spans"
}

function send (body) {
	const path = "http://" + options.host + ":" + options.port + options.path
	Request({
		url: path,
		method: "POST",
		json: true,
		body: [body]
	}, function sent (err, response, body) {
		if (err) {
			return console.log("An error occurred sending trace data", err)
		}

		if (response.statusCode !== HTTP_OK && response.statusCode !== HTTP_RECEIVED) {
			return console.log("Server returned an error:", response.statusCode, "\n", body)
		}
	})
}

function generate_timestamp () {
	// use process.hrtime?
	return new Date().getTime() * TO_MILLISECONDS
}

function generate_id () {
	// copied over from zipkin-js
	var n = ""
	for (var i = 0; i < ID_LENGTH; i++) {
		var rand = Math.floor(Math.random() * ID_DIGITS.length)

		// avoid leading zeroes
		if (rand !== 0 || n.length > 0) {
			n += ID_DIGITS[rand]
		}
	}
	return n
}

function create_root_trace () {
	var id = generate_id()

	return {
		trace_id: id,
		span_id: id,
		parent_span_id: null,
		sampled: true,
		timestamp: generate_timestamp()
	}
}

function get_data (trace_data) {
	if (!trace_data) {
		return create_root_trace()
	}

	return trace_data
}

function get_child (trace_data) {
	if (!trace_data) {
		return create_root_trace()
	}

	return {
		trace_id: trace_data.trace_id,
		parent_span_id: trace_data.span_id,
		span_id: generate_id(),
		sampled: trace_data.sampled,
		timestamp: generate_timestamp()
	}
}

function send_trace (trace, data) {
	var time = generate_timestamp()
	var body = {
		traceId: trace.trace_id,
		name: data.name,
		id: trace.span_id,
		timestamp: trace.timestamp,
		annotations: [],
		binaryAnnotations: []
	}

	if (trace.parent_span_id) {
		body.parentId = trace.parent_span_id
	}

	for (var i = 0; i < data.annotations.length; i++) {
		body.annotations.push({
			endpoint: {
				serviceName: data.service,
				ipv4: 0,
				port: 0
			},
			timestamp: time,
			value: data.annotations[i]
		})
	}

	send(body)
}

function trace_with_annotation (trace, data, annotation) {
	data.annotations = data.annotations || []
	data.annotations.push(annotation)
	return send_trace(trace, data)
}

function client_send (trace, data) {
	return trace_with_annotation(trace, data, "cs")
}

function client_recv (trace, data) {
	return trace_with_annotation(trace, data, "cr")
}

function server_send (trace, data) {
	return trace_with_annotation(trace, data, "ss")
}

function server_recv (trace, data) {
	return trace_with_annotation(trace, data, "sr")
}

function set_options (opts) {
	if (opts) {
		Object.assign(options, opts)
	}

	return options
}

module.exports = {
	options: set_options,
	get_data: get_data,
	get_child: get_child,
	client_send: client_send,
	client_recv: client_recv,
	server_send: server_send,
	server_recv: server_recv
}
