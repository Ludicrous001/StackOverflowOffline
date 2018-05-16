
var http = require('http')
var question_page = require('./question_page')
var answer_page = require('./answer_page')

var questions_per_page = 5

server = http.createServer(function(request, response) {
    response.writeHeader(200, {"Content-Type": "text/html"})

    // User is clicking on links... resolve what they want based on the URL path
    if (request.method == 'GET') {

        // Show the homepage (most highly voted questions)
        if (request.url == '/') {
            question_page.show_questions(response, 0, null, questions_per_page)
        }

        // Page buttons clicked
        else if (request.url.startsWith('/page')) {
            var page_num = parseInt(request.url.replace('/page', ''))
            question_page.show_questions(response, page_num, null, questions_per_page)
        }

        // A question was clicked
        else if (request.url.startsWith('/question')) {
            var question_id = parseInt(request.url.replace('/question', ''))
            answer_page.show_answers(response, question_id)
        }

        // User used the search bar
        else if (request.url.startsWith('/search?q=')) {
            var search_terms = request.url.replace('/search?q=', '')
            var params = search_terms.split('/page')
            if (params.length == 1) {
                search_terms = params[0]
                page_num = '0'
            }
            else {
                search_terms = params[0]
                page_num = params[1]
            }

            question_page.show_questions(response, parseInt(page_num), search_terms, questions_per_page)
        }

        // Throw away anything unexpected (favicon.ico)
        else {
            response.end()
        }
    }

    // Throw away all other cases
    else {
        response.end()
    }

}).listen(1337, '127.0.0.1')
server.timeout = 0
