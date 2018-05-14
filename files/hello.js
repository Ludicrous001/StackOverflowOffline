
/*
Requires a postgresql database created from https://github.com/Networks-Learning/stackexchange-dump-to-postgres
    --with-post-body is required for Posts.xml
primary.css downloaded from stackoverflow.com
*/

var http = require('http')
const { Pool, Client } = require('pg')
var fs = require('fs')
var btoa = require('btoa')
var striptags = require('striptags')
//var striptags = require('html2plaintext')
//var striptags = require('sanitize-html')
var escape_html = require('escape-html');

var html = '<!DOCTYPE HTML><html><body>'
var _html = '</body></html>'

//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
// Start NodeJS server
server = http.createServer(function(request, response) {
    response.writeHeader(200, {"Content-Type": "text/html"})

    // Show the homepage (most highly voted questions)
    if (request.url == '/') {
        show_questions(response, 0)
    }

    // User is clicking on links... resolve what they want based on the URL path
    else if (request.method == 'GET') {

        // Next or previous was clicked, show next batch of questions
        if (request.url.startsWith('/page')) {
            var page_num = parseInt(request.url.replace('/page', ''))
            show_questions(response, page_num, null)
        }

        // A question was clicked, show all the answers
        else if (request.url.startsWith('/question')) {
            var question_id = parseInt(request.url.replace('/question', ''))
            show_answers(response, question_id)
        }

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

            show_questions(response, parseInt(page_num), search_terms)
        }

        // Throw away anything unexpected (favicon.ico)
        else {
            response.end()
        }
    }

    // Throw away all other cases (POST)
    else {
        response.end()
    }

}).listen(1337, '127.0.0.1')
server.timeout = 0

//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
function show_answers(response, question_id) {
    const client = new Client({
        user: 'postgres',
        host: '127.0.0.1',
        database: 'stackoverflow',
        port: 5432,
    })
    client.connect(function(err, callback) {
        if(err) {
            console.log("Failed to connect to Database")
            response.write(html + "Failed to connect to database" + _html)
            response.end()
            return
        }

        fs.readFile('./primary.css', function (err, css) {
            client.query('SELECT * FROM posts WHERE id=' + question_id, (err, question) => {
                if(err) {
                    console.log("Failed to Query Database")
                    response.write(html + "Failed to query database" + _html)
                    response.end()
                    return
                }
                client.query('SELECT * FROM posts WHERE parentid=' + question_id + ' ORDER BY score DESC', (err, answers) => {
                    if(err) {
                        console.log("Failed to Query Database")
                        response.write(html + "Failed to query database" + _html)
                        response.end()
                        return
                    }

                    // Construct SQL statement to get all the comments for this question
                    var num_answers = question.rows[0]['answercount']
                    var answer_ids = []
                    for (var i = 0; i < parseInt(num_answers); i++) {
                        answer_ids.push(answers.rows[i]['id'])
                    }
                    answer_ids.push(question_id)
                    var sql_comments = 'SELECT * FROM comments WHERE postid IN ('
                    for (var i = 0; i < answer_ids.length; i++) {
                        sql_comments = sql_comments + answer_ids[i] + ", "
                    }
                    sql_comments = sql_comments.substring(0, sql_comments.length - 2);
                    sql_comments += ') ORDER BY creationdate ASC'

                    client.query(sql_comments, (err, comments) => {
                        if(err) {
                            console.log("Failed to Query Database2")
                            response.write(html + "Failed to query database" + _html)
                            response.end()
                            return
                        }

                        var html_begin = '<!DOCTYPE html><html>'
                        var html_end = '</div></div></div></div></html>'

                        var title = escape_html(question.rows[0]['title'])
                        var question_body = question.rows[0]['body']
                        var num_answers = question.rows[0]['answercount']
                        var question_score = question.rows[0]['score']
                        var asked_by = question.rows[0]['owneruserid']

                        var html_title = '<div class="container _full"><div id="content" class="snippet-hidden"><div class="inner-content clearfix">\
                                      <div id="question-header"><h1 itemprop="name"><a href="" class="question-hyperlink">' +
                                      title + '<br><h1><i>' +
                                      num_answers + ' Answers</i><h1>'

                        var html_body = '</a></h1></div><div id="mainbar" role="main" aria-label="question and answers">\
                                    <div class="question" data-questionid="1642028" id="question"><div class="post-layout">\
                                    <div class="votecell post-layout--left"><div class="vote">\
                                    <span itemprop="upvoteCount" class="vote-count-post high-scored-post">' +
                                    question_score + '</span><div class="favoritecount"><b>' +
                                    '</b></div></div></div>' +
                                    '<h>' + question_body

                        var user_image = generate_user_icon(asked_by)
                        var html_asked_by = '</div><div class="user-gravatar32"><a href=""><div class="gravatar-wrapper-32">' +
                                            '<img src="data:image/bmp;base64, ' +
                                            user_image + '"/></div></a></div><div class="user-details"><a href="">' +
                                            asked_by + '</a>'

                        // Send HTML before loops
                        response.write(html_begin + '<style>' + css + '</style>' + html_title + html_body + html_asked_by)

                        // Begin looping through comments for the question
                        for (var j = 0; j < comments.rows.length; j++) {
                            var post_id = parseInt(comments.rows[j]['postid'])
                            if (post_id != question_id)
                                continue

                            var comment_score = comments.rows[j]['score']
                            var comment_text = comments.rows[j]['text']
                            var comment_name = comments.rows[j]['userid']

                            var html_comment_score = '<div class="post-layout--right"><div class="comments js-comments-container ">\
                                                 <ul class="comments-list js-comments-list" data-remaining-comments-count="21" data-canpost="false" data-cansee="true" data-comments-unavailable="false" data-addlink-disabled="true">\
                                                 <li class="comment js-comment " data-comment-id="1511833"><div class="js-comment-actions comment-actions"><div class="comment-score">\
                                                 <span title="number of &#39;useful comment&#39; votes received" class="supernova">' +
                                                 comment_score
                            var html_comment = '</span></div></div><div class="comment-text js-comment-text-and-form">' +
                                            comment_text + '<br>–&nbsp;' +
                                            comment_name
                            var html_comment_end = '</div></li></ul></div></div>'

                            response.write(html_comment_score + html_comment + html_comment_end)
                        }

                        // Begin looping through answers
                        for (var i = 0; i < parseInt(num_answers); i++) {
                            var answer_id = answers.rows[i]['id']
                            var answer_score = answers.rows[i]['score']
                            var answer_body = answers.rows[i]['body']
                            var answer_author = answers.rows[i]['owneruserid']

                            var html_score = '<div class="answer accepted-answer" data-answerid="1642035" itemscope="" itemtype="http://schema.org/Answer" itemprop="acceptedAnswer">\
                                          <div class="post-layout"><div class="votecell post-layout--left"><div class="vote"><span itemprop="upvoteCount" class="vote-count-post high-scored-post">' +
                                          answer_score + '</span></div></div>'
                            var html_answer_body = '<div class="answercell post-layout--right"><div class="post-text" itemprop="text">' +
                                               answer_body + '</div>'
                            var user_image = generate_user_icon(answer_author)
                            var html_asked_by = '<div></div><div class="user-gravatar32"><a href=""><div class="gravatar-wrapper-32">' +
                                              '<img src="data:image/bmp;base64, ' +
                                              user_image + '"/></div></a></div><div class="user-details"><a href="">' +
                                              answer_author + '</a><br><br></div>'
                            var html_answer_end = '</div></div><hr>'

                            // Send generated HTML for answer
                            response.write(html_score + html_answer_body + html_asked_by)

                            // Begin looping through comments for the answers
                            for (var j = 0; j < comments.rows.length; j++) {
                                var post_id = comments.rows[j]['postid']
                                if (post_id != answer_id)
                                    continue

                                var comment_score = comments.rows[j]['score']
                                var comment_text = comments.rows[j]['text']
                                var comment_name = comments.rows[j]['userid']

                                var html_comment_score = '<div class="post-layout--right"><div class="comments js-comments-container ">\
                                                     <ul class="comments-list js-comments-list" data-remaining-comments-count="21" data-canpost="false" data-cansee="true" data-comments-unavailable="false" data-addlink-disabled="true">\
                                                     <li class="comment js-comment " data-comment-id="1511833"><div class="js-comment-actions comment-actions"><div class="comment-score">\
                                                     <span title="number of &#39;useful comment&#39; votes received" class="supernova">' +
                                                     comment_score
                                var html_comment = '</span></div></div><div class="comment-text js-comment-text-and-form">' +
                                                comment_text + '<br>–&nbsp;' +
                                                comment_name
                                var html_comment_end = '</div></li></ul></div></div>'

                                response.write(html_comment_score + html_comment + html_comment_end)
                            }

                            response.write(html_answer_end)
                        }

                        // Send final HTML segment
                        response.write(html_end)
                        response.end()
                        client.end()
                    })
                })
            })
        })
    })
}

//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
function show_questions(response, page_number, search_terms) {

    var questions_per_page = 5

    const client = new Client({
        user: 'postgres',
        host: '127.0.0.1',
        database: 'stackoverflow',
        port: 5432,
    })
    client.connect(function(err, callback) {
        if(err) {
            console.log("Failed to connect to Database")
            response.write(html + "Failed to connect to database" + _html)
            response.end()
            return
        }
        /*
        sql_query = 'SELECT * FROM posts WHERE title IS NOT NULL AND '
        for (var i = 0; i < search_terms.length; i++) {
            sql_query += "CONTAINS(title, '" + search_terms[i] + "') AND "
        }
        sql_query = sql_query.substring(0, sql_query.length - 4);
        sql_query += 'ORDER BY score DESC LIMIT 30 OFFSET ' + 30*page_number
        */

        fs.readFile('./primary.css', function (err, css) {
            var sql_query = ''
            if (search_terms == null) {
                sql_query = 'SELECT * FROM posts WHERE title IS NOT NULL ORDER BY score DESC LIMIT ' + questions_per_page + ' OFFSET ' + questions_per_page*page_number
            }
            else {
                search_terms_split = search_terms.split('+')
                sql_query = 'SELECT * FROM posts WHERE title IS NOT NULL AND ('
                for (var i = 0; i < search_terms_split.length; i++) {
                    sql_query += "tags LIKE '%" + search_terms_split[i].toLowerCase() + "%' OR "
                }
                sql_query = sql_query.substring(0, sql_query.length - 4);
                sql_query += ") AND "

                for (var i = 0; i < search_terms_split.length; i++) {
                    sql_query += "LOWER(title) LIKE '%" + search_terms_split[i].toLowerCase() + "%' AND "
                }
                sql_query = sql_query.substring(0, sql_query.length - 4);
                sql_query += 'LIMIT ' + questions_per_page + ' OFFSET ' + questions_per_page*page_number
            }

            client.query(sql_query, (err, res) => {
                if(err) {
                    console.log("Failed to Query Database")
                    response.write(html + "Failed to query database" + _html)
                    response.end()
                    return
                }

                var html_begin = '<!DOCTYPE html><html class=""><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\
                              <title>aStack Overflow - Offline</title><div id="content"><div id="mainbar"><div class="subheader">\
                              <h1>Questions</h1><form id="search" align="right" action="/search" method="get">\
                              <input name="q" type="text" placeholder="Search..." value="" autocomplete="off" maxlength="500" class="f-input js-search-field">\
                              <button class="astext"><svg aria-hidden="true" class="svg-icon iconSearch" width="18" height="18" viewBox="0 0 18 18">\
                              <path d="M12.86 11.32L18 16.5 16.5 18l-5.18-5.14v-.35a7 7 0 1 1 1.19-1.19h.35zM7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10z"></path></svg></button></form></div>'

                var html_end = '</div></div></html>'

                if (search_terms == null) {
                    // Add Previous & Next page buttons
                    var previous_page = 'page' + (page_number-1)
                    if (page_number-1 < 0)
                        previous_page = 'page' + '0'
                    var next_page = 'page' + (page_number+1)
                    var first_page = 'page0'
                }
                else {
                    // Add Previous & Next page buttons
                    var previous_page = 'search?q=' + search_terms + '/page' + (page_number-1)
                    if (page_number-1 < 0)
                        previous_page = 'search?q=' + search_terms + '/page' + '0'
                    var next_page = 'search?q=' + search_terms + '/page' + (page_number+1)
                    var first_page = 'search?q=' + search_terms + '/page0'
                }

                var html_page_buttons = '<div class="question-summary"><a href="' +
                                    first_page + '" rel="first" title="go to page x">\
                                    <span class="page-numbers next"> first</span> </a><a href="' +
                                    previous_page + '" rel="previous" title="go to page ' +
                                    previous_page + '"><span class="page-numbers next"> previous</span></a><a href="' +
                                    next_page + '" rel="next" title="go to page' +
                                    next_page + '"><span class="page-numbers next"> next</span></a></div>'

                // Send begenning of HTML page before for loop
                response.write(html_begin + '<style>' + css + '</style>' + html_page_buttons)

                // Construct questions to display on the HTML homepage
                for(var i = 0; i < questions_per_page; i++) {

                    var title = escape_html(res.rows[i]['title'])
                    var title_link = 'question' + res.rows[i]['id']

                    if (title == 'null' || title == null)
                        continue

                    // Parse SQL Query
                    var score = res.rows[i]['score']
                    var num_answers = res.rows[i]['answercount']
                    var num_views = number_to_shorthand(res.rows[i]['viewcount'])
                    var date_asked = res.rows[i]['creationdate']
                    var asked_by = res.rows[i]['owneruserid']
                    // TODO: Get user name, rep, gold, silver, and bronze
                    var asked_by_rep = number_to_shorthand('0')
                    var asked_by_rep_gold = number_to_shorthand('0')
                    var asked_by_rep_silver = number_to_shorthand('0')
                    var asked_by_rep_bronze = number_to_shorthand('0')
                    var post_tags = res.rows[i]['tags'].split('<')
                    var post_body_sample = striptags(res.rows[i]['body']).substring(0, 1000)
                    post_body_sample = post_body_sample.substring(0, 200) + ' ...'

                    // Construct HTML and fill in data from SQL Query
                    var html_votes = '<div class="question-summary"><div class="statscontainer">\
                                      <div class="stats"><div class="vote"><div class="votes">\
                                      <span class="vote-count-post high-scored-post"><strong>' +
                                      score + '</strong></span>'
                    var html_answers = '<div>votes</div></div></div><div class="status answered-accepted"><strong>' +
                                        num_answers + '</strong>answers'
                    var html_views = '</div></div><div class="views supernova" title="1,195,241 views">' +
                                      num_views + ' views'
                    var html_title = '</div></div><div class="summary"><h3><a href="' +
                                      title_link + '" class="question-hyperlink">' +
                                      title + '</a></h3>'
                    var html_body_sample = '<div class="excerpt">' + post_body_sample
                    var html_tags = '</div><div class="tags t-java t-cçç t-performance t-optimization t-branch-prediction">'
                    for (var t in post_tags) {
                        if (post_tags[t] == '')
                            continue
                        html_tags += '<a href="" class="post-tag" title="show questions tagged &#39;java&#39;" rel="tag">' +
                                     post_tags[t].split('>')[0] + '</a>'
                    }
                    var html_date_asked = '</div><div class="started fr"><div class="user-info user-hover"><div class="user-action-time">\
                                          asked <span title="2012-06-27 13:51:36Z" class="relativetime">' +
                                          date_asked + '</span>'
                    var user_image = generate_user_icon(asked_by)
                    var html_asked_by = '</div><div class="user-gravatar32"><a href=""><div class="gravatar-wrapper-32">' +
                                        '<img src="data:image/bmp;base64, ' +
                                        user_image + '"/></div></a></div><div class="user-details"><a href="">' +
                                        asked_by + '</a>'
                    var html_asked_by_rep = '<div class="-flair"><span class="reputation-score" title="reputation score 282,146" \dir="ltr">' +
                                            asked_by_rep + '</span><span title="37 gold badges"><span class="badge1"></span><span class="badgecount">' +
                                            asked_by_rep_gold + '</span></span><span title="395 silver badges"><span class="badge2"></span><span class="badgecount">' +
                                            asked_by_rep_silver + '</span></span><span title="497 bronze badges"><span class="badge3"></span><span class="badgecount">' +
                                            asked_by_rep_bronze + '</span></span>'
                    var html_answer_end = '</div></div></div></div></div></div>'

                    // Send each constructed question
                    response.write(html_votes + html_answers + html_views + html_title + html_body_sample + html_tags + html_date_asked + html_asked_by + html_asked_by_rep + html_answer_end)
                }

                // Send final HTML segment
                response.write(html_page_buttons + html_end)
                response.end()
                client.end()
            })
        })
    })
}

//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
// Create an image for each user
function generate_user_icon(name) {
    var array = new Uint8Array(3942)
    // BMP header for 36x36 icon
    array[0]=0x42,  array[1]=0x4d,  array[2]=0x66,  array[3]=0x0f,  array[4]=0x00,  array[5]=0x00
    array[6]=0x00,  array[7]=0x00,  array[8]=0x00,  array[9]=0x00,  array[10]=0x36, array[11]=0x00
    array[12]=0x00, array[13]=0x00, array[14]=0x28, array[15]=0x00, array[16]=0x00, array[17]=0x00
    array[18]=0x24, array[19]=0x00, array[20]=0x00, array[21]=0x00, array[22]=0x24, array[23]=0x00
    array[24]=0x00, array[25]=0x00, array[26]=0x01, array[27]=0x00, array[28]=0x18, array[29]=0x00
    array[30]=0x00, array[31]=0x00, array[32]=0x00, array[33]=0x00, array[34]=0x30, array[35]=0x0f
    array[36]=0x00, array[37]=0x00, array[38]=0x00, array[39]=0x00, array[40]=0x00, array[41]=0x00
    array[42]=0x00, array[43]=0x00, array[44]=0x00, array[45]=0x00, array[46]=0x00, array[47]=0x00
    array[48]=0x00, array[49]=0x00, array[50]=0x00, array[51]=0x00, array[52]=0x00, array[53]=0x00

    for (var x = 54; x < 3942; x+=3) {
        k = x - 54

        // Top & Bottom black Border
        if (k / 108 < 3 || k / 108 > 33)
        {
            bb = 0x00
            gg = 0x00
            rr = 0x00
        }
        // Left and Right black Border
        else if (k % 108 < 5 || k % 108 > 101)
        {
            bb = 0x00
            gg = 0x00
            rr = 0x00
        }
        else {
            // Generate image data from the user's name
            bb = name * 3 % 256
            gg = name * 7 % 256
            rr = name * 4 % 256
        }

        array[x+0] = bb // Blue
        array[x+1] = gg // Green
        array[x+2] = rr // Red
    }

    //return btoa(new TextDecoder("utf-8").decode(array))
    return btoa(String.fromCharCode.apply(null, array))
}

//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
// Represent a number as 12.2m, 908k, etc...
function number_to_shorthand(number) {
    number = parseInt(number)
    if (number > 1000000000) {
        number = (Math.round( (number / 1000000000) * 10) / 10 + 'b').toString()
    }
    else if (number > 1000000) {
        number = (Math.round( (number / 1000000) * 10) / 10 + 'm').toString()
    }
    else if (number > 1000) {
        number = (Math.round( (number / 1000) * 10) / 10 + 'k').toString()
    }
    else {
        number = number.toString()
    }
    return number
}
