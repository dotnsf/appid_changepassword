//. create_users_to_appid.js
//. CSV ファイルを指定してユーザーを AppID に一括追加する際のスクリプトツール
var settings = require( './settings' );

var fs = require( 'fs' ),
    readline = require( 'readline' ),
    request = require( 'request' );


if( process.argv.length < 3 ){
  usage();
  process.exit( 1 );
}

var csvfilename = process.argv[2];
getAccessToken().then( function( access_token ){
  if( access_token ){
    var rs = fs.createReadStream( csvfilename );
    var rl = readline.createInterface({
      input: rs,
      output: null
    });
    rl.on( 'line', function( line ){
      var tmp = line.split( ',' );
      if( tmp.length > 2 ){
        var name = tmp[0];
        var email = tmp[1];
        var password = tmp[2];

        console.log( { name: name, email: email, password: password } );
        createUser( access_token, name, email, password ).then( function( result ){
          //console.log( { result } );
        }).catch( function( err2 ){
          console.log( { err2 } );
        });
      }
    });
    rl.on( 'close', function(){
    });
  }else{
    console.log( 'no access_token.' );
  }
}).catch( function( { err1 } ){
  console.log( err1 );
});

async function getAccessToken(){
  return new Promise( async ( resolve, reject ) => {
    //. GET an IAM token
    //. https://cloud.ibm.com/docs/appid?topic=appid-manging-api&locale=ja
    var headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };
    var option = {
      url: 'https://iam.cloud.ibm.com/oidc/token',
      method: 'POST',
      body: 'grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=' + settings.apiKey,
      headers: headers
    };
    request( option, ( err, res, body ) => {
      if( err ){
        console.log( err );
        reject( null );
      }else{
        body = JSON.parse( body );
        var access_token = body.access_token;
        resolve( access_token );
      }
    });
  });
}

//. こっちだと（sub でなく）id でも取得はできる
//. でも OAuth ログインで取得できるのは sub なので無意味だし、
//. createUser で sub が作られないのがそもそもおかしい
async function getUserinfo( access_token, user_id ){
  return new Promise( async ( resolve, reject ) => {
    if( access_token ){
      var headers1 = {
        accept: 'application/json',
        authorization: 'Bearer ' + access_token
      };
      var option1 = {
        url: 'https://' + settings.region + '.appid.cloud.ibm.com/management/v4/' + settings.tenantId + '/cloud_directory/' + user_id + '/userinfo',
        method: 'GET',
        headers: headers1
      };
      request( option1, ( err1, res1, body1 ) => {
        if( err1 ){
          console.log( 'err1', err1 );
          reject( err1 );
        }else{
          var userinfo = JSON.parse( body1 );
          console.log( JSON.stringify( userinfo, null, 2 ) );
          resolve( userinfo );
        }
      });
    }else{
      reject( 'no access token' );
    }
  });
}

//. https://us-south.appid.cloud.ibm.com/swagger-ui/#/Management%20API%20-%20Cloud%20Directory%20Users/mgmt.createCloudDirectoryUser
async function createUser( access_token, user_name, user_email, user_password ){
  return new Promise( async ( resolve, reject ) => {
    if( access_token ){
      var headers1 = {
        accept: 'application/json',
        authorization: 'Bearer ' + access_token
      };
      var option1 = {
        url: 'https://' + settings.region + '.appid.cloud.ibm.com/management/v4/' + settings.tenantId + '/cloud_directory/Users',
        method: 'POST',
        json: {
          active: true,
          emails: [
            {
              value: user_email,
              primary: true
            }
          ],
          name: {
            givenName: user_name,
            familyName: '',
            formatted: user_name
          },
          displayName: user_name,
          userName: user_name,   //. 8文字以上で、使っていい文字も決まっていて・・・
          password: user_password,
          status: "CONFIRMED"
        },
        headers: headers1
      };
      request( option1, async ( err1, res1, body1 ) => {
        if( err1 ){
          console.log( 'err1', err1 );
          reject( err1 );
        }else{
          //console.log( { body1 } );
          var result1 = JSON.parse( JSON.stringify( body1 ) );  //. result1 = { id: 'xx', .. }
          //console.log( { result1 } );

          //var profile1 = await getProfile( access_token, result1.id );
          var profile1 = await getUserinfo( access_token, result1.id );
          console.log( JSON.stringify( profile1, null, 2 ) );

          resolve( result1 );
        }
      });
    }else{
      reject( 'no access token' );
    }
  });
}


function usage(){
  console.log( 'Usage: node create_users_to_appid [csvfilename]' );
  console.log( '  - [csvfilename] : 作成ユーザー情報の CSV ファイル' );
}

