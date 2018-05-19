
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

    // Connect to the database
    client.connect(function(err, callback) {
        if (handle_error(response, err))
            return

        // Load CSS and html template
        fs.readFile('./primary.css', function (err, css) {
            fs.readFile('./answer_page.html', function (err, answer_page_template) {

                // Get the question from the database
                client.query('SELECT * FROM posts WHERE id=' + question_id, (err, question) => {
                    if (handle_error(response, err))
                        return

                    // Get all answers to the question from the database
                    client.query('SELECT * FROM posts WHERE parentid=' + question_id + ' ORDER BY score DESC', (err, answers) => {
                        if (handle_error(response, err))
                            return

                        // Construct SQL statement to get all the comments for the question and answers
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

                        // Get all the comments from the databse
                        client.query(sql_comments, (err, comments) => {
                            if (handle_error(response, err))
                                return

                            answer_page_template = answer_page_template.toString()
                            answer_page_template = answer_page_template.split("ZZZ_QUESTION_COMMENTS_ZZZ")
                            html_begin = answer_page_template[0]
                            html_question_comments = answer_page_template[1]
                            html_remaining = answer_page_template[2]

                            var title = escape_html(question.rows[0]['title'])
                            var question_body = question.rows[0]['body']
                            var num_answers = question.rows[0]['answercount']
                            var question_score = question.rows[0]['score']
                            var asked_by = question.rows[0]['owneruserid']
                            var user_image = utils.generate_user_icon(asked_by)

                            html_begin = html_begin.replace(/{XXX_CSS_XXX}/g, css)
                            html_begin = html_begin.replace(/XXX_QUESTION_TITLE_XXX/g, title)
                            html_begin = html_begin.replace(/XXX_QUESTION_SCORE_XXX/g, question_score)
                            html_begin = html_begin.replace(/XXX_FAVORITE_COUNT_XXX/g, "")
                            html_begin = html_begin.replace(/XXX_QUESTION_BODY_XXX/g, question_body)
                            html_begin = html_begin.replace(/XXX_ASKER_ICON_XXX/g, user_image)
                            html_begin = html_begin.replace(/XXX_ASKED_BY_XXX/g, asked_by)

                            response.write(html_begin)

                            // Begin looping through comments for the question
                            for (var j = 0; j < comments.rows.length; j++) {
                                var comment = html_question_comments
                                var post_id = parseInt(comments.rows[j]['postid'])
                                if (post_id != question_id)
                                    continue

                                var comment_score = comments.rows[j]['score']
                                var comment_text = comments.rows[j]['text']
                                var comment_name = comments.rows[j]['userid']

                                comment = comment.replace(/XXX_QUESTION_COMMENT_SCORE_XXX/g, comment_score)
                                comment = comment.replace(/XXX_QUESTION_COMMENT_BODY_XXX/g, comment_text)
                                comment = comment.replace(/XXX_QUESTION_COMMENTER_NAME_XXX/g, comment_name)

                                response.write(comment)
                            }

                            html_split = html_remaining.split("ZZZ_ANSWERS_ZZZ")
                            html_num_answers = html_split[0]
                            html_answers = html_split[1]
                            html_remaining = html_split[2]
                            html_num_answers = html_num_answers.replace(/XXX_NUM_ANSWERS_XXX/g, num_answers)
                            response.write(html_num_answers)

                            // Begin looping through answers
                            for (var i = 0; i < parseInt(num_answers); i++) {
                                var html_answer = html_answers
                                var answer_id = answers.rows[i]['id']
                                var answer_score = answers.rows[i]['score']
                                var answer_body = answers.rows[i]['body']
                                var answer_author = answers.rows[i]['owneruserid']
                                var user_image = utils.generate_user_icon(answer_author)

                                html_answer = html_answer.replace(/XXX_ANSWER_SCORE_XXX/g, answer_score)
                                html_answer = html_answer.replace(/XXX_ANSWER_BODY_XXX/g, answer_body)
                                html_answer = html_answer.replace(/XXX_ANSWERER_NAME_XXX/g, answer_author)
                                html_answer = html_answer.replace(/XXX_ANSWER_SCORE_XXX/g, answer_score)
                                html_answer = html_answer.replace(/XXX_ANSWERER_ICON_XXX/g, user_image)
                                html_answer = html_answer.replace(/XXX_ANSWERER_XXX/g, answer_author)

                                html_split = html_answer.split("ZZZ_ANSWER_COMMENTS_ZZZ")
                                html_answer = html_split[0]
                                html_comments = html_split[1]
                                html_remaining_answer = html_split[2]

                                response.write(html_answer)

                                // Begin looping through comments for the answers
                                for (var j = 0; j < comments.rows.length; j++) {
                                    var html_comment = html_comments
                                    var post_id = comments.rows[j]['postid']
                                    if (post_id != answer_id)
                                        continue

                                    var comment_score = comments.rows[j]['score']
                                    var comment_text = comments.rows[j]['text']
                                    var comment_name = comments.rows[j]['userid']

                                    html_comment = html_comment.replace(/XXX_ANSWER_COMMENT_SCORE_XXX/g, comment_score)
                                    html_comment = html_comment.replace(/XXX_ANSWER_COMMENT_BODY_XXX/g, comment_text)
                                    html_comment = html_comment.replace(/XXX_ANSWER_COMMENTER_NAME_XXX/g, comment_name)

                                    response.write(html_comment)
                                }
                                response.write(html_remaining_answer)
                            }

                            // Send final HTML segment
                            response.write(html_remaining)
                            response.end()
                            client.end()
                        })
                    })
                })
            })
        })
    })
}
