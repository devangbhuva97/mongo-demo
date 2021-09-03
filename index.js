require('dotenv').config();
const mongoose = require("mongoose")

const priceSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    deleted: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
)

const Price = mongoose.model("Price", priceSchema)

const productSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    deleted: { type: Boolean, required: true, default: false }
  },
  { timestamps: true }
)

const Product = mongoose.model("Product", productSchema)

async function connectMongoDB(){
  try {
    await mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true })
    console.log('Mongodb connected')
  } catch (error) {
    console.log('Could not connect with mongodb', error)
    throw error
  }
}

async function withPromiseAll() {
  let session;
  try {
    
    session = await mongoose.startSession();
    session.startTransaction()

    const [ product, price ] = await Promise.all([
      Product.updateMany({}, { delete: true }, { session }),
      Price.updateMany({}, { delete: true }, { session })
    ])

    await session.commitTransaction()
    session.endSession()

    return { success: true, type: 'With Promise.all', data: { product, price } }

  } catch (error) {
    
    // console.log(error)

    if (session) {
      await session.abortTransaction()
      session.endSession()
    }

    return { success: false, type: 'With Promise.all', message: error && error.message || 'Something went wrong!' }

  }
}

async function withoutPromiseAll() {
  let session;
  try {

    session = await mongoose.startSession();
    session.startTransaction()

    const price = await Price.updateMany({}, { delete: true }, { session });
    const product = await Product.updateMany({}, { delete: true }, { session });

    await session.commitTransaction()
    session.endSession()

    return { success: true, type: 'Without Promise.all', data: { product, price } }

  } catch (error) {

    // console.log(error)

    if (session) {
      await session.abortTransaction()
      session.endSession()
    }

    return { success: false, type: 'Without Promise.all', message: error && error.message || 'Something went wrong!' }

  }
}

async function testWithPromiseAll(times) {
  let success = 0, error = 0;
  for (let count = 0; count < times; count++) {
    const data = await withPromiseAll()
    console.log(count, '------>' ,JSON.stringify(data))
    if (data.success) ++success
    else ++error
  }
  return { success, error }
}

async function testWithoutPromiseAll(times) {
  let success = 0, error = 0;
  for (let count = 0; count < times; count++) {
    const data = await withoutPromiseAll()
    console.log(count, '------>' ,JSON.stringify(data))
    if (data.success) ++success
    else ++error
  }
  return { success, error }
}

async function runTest(times) {
  await connectMongoDB();
  const withoutPromiseAllData = await testWithoutPromiseAll(times)
  const withPromiseAllData = await testWithPromiseAll(times)
  return {
    totalTest: times,
    withoutPromiseAllData,
    withPromiseAllData
  }
}

runTest(20).then(console.log).catch(console.error)