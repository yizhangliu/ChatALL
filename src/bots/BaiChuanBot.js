import Bot from "@/bots/Bot";
import axios from "axios";
import { SSE } from "sse.js";

export default class BaiChuanBot extends Bot {
  static _brandId = "baiChuan"; // Brand id of the bot, should be unique. Used in i18n.
  static _className = "BaiChuanBot"; // Class name of the bot
  static _logoFilename = "baichuan-logo.png"; // Place it in public/bots/
  static _loginUrl = "https://www.baichuan-ai.com/";

  constructor() {
    super();
  }

  async _checkAvailability() {
    let available = false;

    await axios
      .get("https://www.baichuan-ai.com/api/user/user-info")
      .then((response) => {
        available = response.data?.message == "ok";
      })
      .catch((error) => {
        console.error("Error checking baichuan Chat login status:", error);
      });

    return available;
  }

  async createChatContext() {
    return {};
  }

  /**
   * Send a prompt to the bot and call onResponse(response, callbackParam)
   * when the response is ready.
   * @param {string} prompt
   * @param {function} onUpdateResponse params: callbackParam, Object {content, done}
   * @param {object} callbackParam - Just pass it to onUpdateResponse() as is
   */
  // eslint-disable-next-line
  async _sendPrompt(prompt, onUpdateResponse, callbackParam) {
    const context = await this.getChatContext();
    let res = "";
    const headers = {
      accept: "text/event-stream",
      "content-type": "application/json",
    };
    // // conversation_id: "",
    // is_regenerate: false,
    // is_so: false,
    // prompt: prompt,
    // role: "00000001",
    // source_type: "prophet_web",
    var payload_json_data = {
      request_id: "9d9644d0-5ca4-4f25-870a-b483362cb33d-1",
      stream: true,
      prompt:{id: "U7cf8009EF2opL5", data: prompt, from: 0, parent_id: 0, created_at: 1694674970882},
      app_info: {
              id: 10001,
              name: "baichuan_web",
              },
      user_info: {
              id: 18361,
              status: 1,
              },
        // "session_info":{"id":"pf454009EP0","name":"今天是周四","created_at":1694674970706},
      assistant_info:{},
      parameters: {
              repetition_penalty: -1,
              temperature: -1,
              top_k: -1,
              top_p: -1,
              max_new_tokens: -1,
              do_sample: -1,
              regenerate: 0,
              },
      history:[],
    };
    const payload = JSON.stringify(payload_json_data);

    //   https://www.baichuan-ai.com/api/auth/session
    // {"user":{"id":18361,"phone":"18620039022","status":1,
    //   "__uid":"4f1b046152e2d6acece51cbcb443259d9c14704ccb0466c3ad24297868616de2"},
    //   "expires":"2023-09-21T06:52:59.683Z"}


    //   https://www.baichuan-ai.com/api/user/user-info
    //   {"message":"ok","code":200,"data":{"id":18361,"name":null,"email":null,
    //        "phone":"18620039022","status":1,"uniqueId":"WdtnMpD4"}}


    //  https://www.baichuan-ai.com/api/chat/v1/chat
    //  {"request_id":"9d9644d0-5ca4-4f25-870a-b483362cb33d",
    //      "stream":true,
    //      "prompt":{"id":"U7cf8009EF2opL5","data":"今天是周四","from":0,"parent_id":0,"created_at":1694674970882},
    //      "app_info":{"id":10001,"name":"baichuan_web"},
    //      "user_info":{"id":18361,"status":1},
    //      "session_info":{"id":"pf454009EP0","name":"今天是周四","created_at":1694674970706},
    //      "assistant_info":{},
    //      "parameters":{"repetition_penalty":-1,"temperature":-1,"top_k":-1,"top_p":-1,"max_new_tokens":-1,"do_sample":-1,"regenerate":0},
    //      "history":[{"id":"U2694009DEdfwO3","from":0,"data":"你好\n","createdAt":1694587181907},
    //        {"id":"Mff4c009D6dgw2Q","from":1,"data":" 你好！有什么我可以帮助你的吗？","createdAt":1694587181908}]}

    return new Promise((resolve, reject) => {
      // "https://chat.360.cn/backend-api/api/common/chat"
      // "https://www.baichuan-ai.com/api/chat/v1/chat"
      try {
        const source = new SSE(
          "https://www.baichuan-ai.com/api/chat/v1/chat",
          {
            headers,
            payload,
          },
        );

        source.addEventListener("200", (event) => {
          res += event.data;
          onUpdateResponse(callbackParam, {
            content: res,
            done: true,
          });
          resolve();
        });

        //Get CONVERSATIONID e.g: CONVERSATIONID####f9563471f24a088d
        source.addEventListener("100", (event) => {
          context.parentConversationId = event.data.split("####")[1];
        });

        //Get MESSAGEID e.g: MESSAGEID####f9563471f24a088ddd34826b527ffdfb
        source.addEventListener("101", (event) => {
          context.parentMessageId = event.data.split("####")[1];
        });

        //unable to answer the user's question.
        source.addEventListener("40042", (event) => {
          res += event.data;
          onUpdateResponse(callbackParam, {
            content: res,
            done: true,
          });
        });

        source.addEventListener("error", (event) => {
          console.error(event);
          const message = this.getSSEDisplayError(event);
          reject(message);
        });

        source.stream();
      } catch (err) {
        reject(err);
      }
    });
  }
}
