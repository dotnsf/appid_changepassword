//. change_password.js
var SelfServiceManager = require( 'ibmcloud-appid' ).SelfServiceManager;
var request = require( 'request' );
var settings = require( './settings' );

var managementUrl = 'https://' + settings.region + '.appid.cloud.ibm.com/management/v4/' + settings.tenantId;
var selfServiceManager = new SelfServiceManager({
  iamApiKey: settings.apiKey,
  managementUrl: managementUrl 
});

if( process.argv.length < 4 ){
  usage();
  process.exit( 1 );
}

var user_email = process.argv[2];
var user_password = process.argv[3];
getAccessToken().then( function( access_token ){
  if( access_token ){
    changePassword( access_token, user_email, user_password ).then( function( result ){
      console.log( { result } );
      process.exit( 0 );
    }).catch( function( err2 ){
      console.log( { err2 } );
      process.exit( 1 );
    });
  }else{
    console.log( 'no access_token.' );
    process.exit( 1 );
  }
}).catch( function( { err1 } ){
  console.log( err1 );
  process.exit( 1 );
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

async function changePassword( access_token, email, password ){
  return new Promise( async ( resolve, reject ) => {
    if( access_token ){
      //. email から uuid を取得する必要がある
      var uuid = "";
      var obj = await getUsers();  //. { totalResults: 2, users: [ { id: "xx", email: "xxx", .. }, .. ] }
      for( var i = 0; i < obj.users.length; i ++ ){
        var user = obj.users[i];
        if( user.email.toUpperCase() == email.toUpperCase() ){
          //uuid = user.id;
          //console.log( { user } );
          var profile = await getProfile( user.id );  //. { id: "xx", email: "xxx", identities: [ { id: "yy", .. }, .. ], .. }
          //console.log( { profile } );
          for( var j = 0; j < profile.identities.length; j ++ ){
            var identity = profile.identities[j];
            //console.log( { identity } );
            uuid = identity.id;  //. この identity.id が uuid
          }
        }
      }

      if( uuid ){
        console.log( { uuid } );
        console.log( { email } );
        console.log( { password } );
        selfServiceManager.setUserNewPassword( uuid, password, "en", null, null ).then( function( user ){
          resolve( user );
        }).catch( function( err ){
          reject( err );
        });
      }else{
        reject( 'no user information found.' );
      }
    }else{
      reject( 'no access token' );
    }
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

//. ユーザー一覧を取得
async function getUsers(){
  return new Promise( async ( resolve, reject ) => {
    var access_token = await getAccessToken();
    if( access_token ){
      //console.log( 'access_token = ' + access_token );
      //. https://cloud.ibm.com/docs/appid?topic=appid-user-admin
      var headers1 = {
        accept: 'application/json',
        authorization: 'Bearer ' + access_token
      };
      var option1 = {
        url: 'https://' + settings.region + '.appid.cloud.ibm.com/management/v4/' + settings.tenantId + '/users',
        method: 'GET',
        headers: headers1
      };
      request( option1, ( err1, res1, body1 ) => {
        if( err1 ){
          console.log( 'err1', err1 );
          reject( err1 );
        }else{
          var users = JSON.parse( body1 );
          resolve( users );
        }
      });
    }
  });
}

//. ユーザーIDからプロファイルを取得
async function getProfile( user_id ){
  return new Promise( async ( resolve, reject ) => {
    var access_token = await getAccessToken();
    if( access_token ){
      //console.log( 'access_token = ' + access_token );
      //. https://cloud.ibm.com/docs/appid?topic=appid-user-admin
      var headers1 = {
        accept: 'application/json',
        authorization: 'Bearer ' + access_token
      };
      var option1 = {
        url: 'https://' + settings.region + '.appid.cloud.ibm.com/management/v4/' + settings.tenantId + '/users/' + user_id + '/profile',
        method: 'GET',
        headers: headers1
      };
      request( option1, ( err1, res1, body1 ) => {
        if( err1 ){
          console.log( 'err1', err1 );
          reject( err1 );
        }else{
          var profile = JSON.parse( body1 );
          resolve( profile );
        }
      });
    }
  });
}


function usage(){
  console.log( 'Usage: node change_password [email] [newpassword]' );
  console.log( '  - [email] : ユーザーID' );
  console.log( '  - [newpassword] : 新パスワード' );
}

