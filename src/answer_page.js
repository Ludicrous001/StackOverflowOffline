
module.exports = {
  show_answers: function (response, question_id) {
    show_answers(response, question_id)
  },
};

function handle_error(response, err) {
    if(err) {
        console.log("Failed to connect to Database")
        response.write(html + "Failed to connect to database" + _html)
        response.end()
        return true
    }
    return false
}

function show_answers(response, question_id) {
    var fs = require('fs')
    var escape_html = require('escape-html');
    var utils = require('./utils')
    const { Pool, Client } = require('pg')

    const client = new Client({
        user: 'postgres',
        host: '127.0.0.1',
        database: 'stackoverflow',
        port: 5432,
    })
    client.connect(function(err, callback) {
        if (handle_error(response, err))
            return

        fs.readFile('./primary.css', function (err, css) {
            client.query('SELECT * FROM posts WHERE id=' + question_id, (err, question) => {
                if (handle_error(response, err))
                    return
                client.query('SELECT * FROM posts WHERE parentid=' + question_id + ' ORDER BY score DESC', (err, answers) => {
                    if (handle_error(response, err))
                        return

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
                        if (handle_error(response, err))
                            return

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

                        var user_image = utils.generate_user_icon(asked_by)
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
                            var user_image = utils.generate_user_icon(answer_author)
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
