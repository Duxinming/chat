try {
  // 一个简单的聊天机器人
  const dotenv = require('dotenv')
  const express = require('express')
  // import OpenAI from 'openai'
  const { ChatDeepSeek } = require('@langchain/deepseek')
  const {
    START,
    END,
    MessagesAnnotation,
    StateGraph,
    MemorySaver,
  } = require('@langchain/langgraph')
  const { v4: uuidv4 } = require('uuid')

  dotenv.config()
  const config = { configurable: { thread_id: uuidv4() }, version: 'v2' }
  // 配置 OpenAI

  const llm = new ChatDeepSeek({
    model: 'deepseek-chat',
    temperature: 0,
    apiKey: process.env.DEEPSEEK_API_KEY,
  })

  // const prompt = ChatPromptTemplate.fromMessages([
  //   ['system', '你是一个翻译员，你需要将用户的输入翻译成英文。'],
  //   ['user', '{content}'],
  // ])

  // const chain = prompt.pipe(llm)

  // 定义一个函数，用于调用模型
  async function callModel(state) {
    const messages = [
      // ['system', '你是一个翻译员，你需要将用户的输入翻译成英文'],
      // [
      //   'system',
      //   '用户输入”停止翻译“时，你需要停止翻译，并且变成一个聊天机器人。',
      // ],
      ...state.messages,
    ]
    const response = await llm.invoke(messages)
    //   for await (const chunk of response) {
    //     // res.json(chunk)
    //     console.log(chunk)
    //     yield chunk
    //   }

    return { messages: response }
  }

  // 定义一个StateGraph
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode('model', callModel)
    .addEdge(START, 'model')
    .addEdge('model', END)

  // 添加记忆功能
  const memory = new MemorySaver()
  const chat = workflow.compile({ checkpointer: memory })

  // 初始化 Express 应用
  const app = express()
  // 配置 Express 中间件
  app.use(express.json())
  // 配置静态文件目录
  app.use(express.static('public'))

  // 定义路由
  app.get('/', async (req, res) => {
    const input = [
      {
        role: 'user',
        content: "Hi! I'm Bob.",
      },
    ]
    const output = await chat.invoke({ messages: input }, config)
    res.send(output)
  })

  function llmSteram(input) {
    return llm.stream(input)
  }

  app.post('/chat', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    const input = req.body.message
    //   const output = await chat.invoke({ messages: input }, config)
    //   res.json(output)
    //   const ReadableStream = await chat.invoke({ messages: input }, config)
    //   console.log(ReadableStream)
    //   const reader = ReadableStream.getReader()
    //   reader.read().then(function processText({ done, value }) {
    //     if (done) {
    //       console.log('Stream complete')
    //       return
    //     }
    //     console.log(value) // 输出 'Hello' 和 'World'
    //     return reader.read().then(processText) // 继续读取
    //   })
    let i = 0
    for await (const event of chat.streamEvents({ messages: input }, config)) {
      // res.json(chunk)
      const kind = event.event
      if (kind === 'on_chat_model_stream') {
        //   res.write(`data: ${event.data.chunk.content}\n\n`)
        res.write(
          `data: ${JSON.stringify({
            message: `${event.data.chunk.content}`,
            time: new Date(),
          })}\n\n`
        )
      }
    }
    res.end() // 结束HTTP响应
    //   const ReadableStream = await llmSteram(input)
    //   for await (const chunk of ReadableStream) {
    //     // res.json(chunk)
    //     console.log(chunk)
    //     // res.write(`data: ${chunk.content}\n\n`) // 传输数据
    //   }
  })

  // 启动服务器
  app.listen(3000, () => {
    console.log('Server is running on port 3000')
  })
} catch (e) {
  console.log(e)
} finally {
  console.log('finally')
}
