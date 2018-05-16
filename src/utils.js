
module.exports = {
  generate_user_icon: function (name) {
    return generate_user_icon(name)
  },
  number_to_shorthand: function (number) {
    return number_to_shorthand(number)
  },
};

// Create an image for each user
function generate_user_icon(name) {
    var btoa = require('btoa')

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
