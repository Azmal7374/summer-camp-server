const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;
const app = express();

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log(authorization)
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  //bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wlub5y3.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const usersCollection = client.db("sportsAcademic").collection("users");
    const classesCollection = client.db("sportsAcademic").collection("classes");
    const savedCollection = client.db("sportsAcademic").collection("savedClasses");
    const paymentCollection = client.db("sportsAcademic").collection("payments");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      console.log("Existing user", existingUser);
      if (existingUser) {
        return res.send({ message: "User already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      // console.log(result);
      res.send(result);
    });

    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);

      const result = { instructor: user?.role === "instructor" };
      //  console.log(result);
      res.send(result);
    });

    app.get("/users/student/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ student: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);

      const result = { student: user?.role === "student" };
      //  console.log(result);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      // console.log(result)
      res.send(result);
    });

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/instructor", async (req, res) => {
      const query = { role: "instructor" };
      // console.log(query);
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    //class post and get

    app.get("/class", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });


    app.get("/topClass", async (req, res) => {
      const result = await classesCollection.find().sort({'booking': -1}).toArray();
      res.send(result);
    });

    

    app.get("/class/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const query = { instructorEmail: email };
      // console.log(query);
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/approve", async (req, res) => {
      const query = { status: "approve" };
      // console.log(query);
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/class", async (req, res) => {
      const newItem = req.body;
      // console.log(newItem);
      const result = await classesCollection.insertOne(newItem);
      res.send(result);
    });

    app.patch("/class/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      // const options = {upsert: true};
      const updateDoc = {
        //  seats: { $lt: 0 } ,
        $inc: {
          seats: -1,
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/class/approve/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approve",
        },
      };
      // console.log(updateDoc);
      const result = await classesCollection.updateOne(filter, updateDoc);
      // console.log(result);
      res.send(result);
    });

    app.patch("/class/deny/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "deny",
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //saved calls post


    app.get("/savedClass", async (req, res) => {
      const {id} = req.query
      console.log(id)
      const query = {_id: new ObjectId(id)}
      const result = await savedCollection.findOne(query)
      res.send(result);
    });

    app.get("/selectedClass", async (req, res) => {
      const result = await savedCollection.find().toArray();
      res.send(result);
    });

    app.get("/savedClass/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const query = { studentEmail: email };
      // console.log(query);
      const result = await savedCollection.find(query).toArray();
      res.send(result);
    });

    
   

    

    app.post("/savedClass", async (req, res) => {
    
      const saved = req.body;      
      console.log(saved);
      
      const email =saved.studentEmail
        const name =  saved.name;
      const query = {
        $and: [
          { name: { $eq: name } },
          { studentEmail: { $eq: email } }
        ]
      };
      
      console.log(query);
      const existingClass = await savedCollection.findOne(query);
      console.log("Existing Class", existingClass);

      if (existingClass) {
          return res.send({ message: "Class  already exists" });
        }
      const result = await savedCollection.insertOne(saved);
      console.log(result);
      res.send(result);
    });



     // create payment intent
     app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

     //payment related API

     app.post("/payments/:id", verifyJWT, async (req, res) => {
      const payment = req.body;
      payment.createAt = new Date();
      // console.log(payment)
     
      const insertResult = await paymentCollection.insertOne(payment);
        const id =req.params.id
      const query = {
        _id:new ObjectId(id),
      };
      const deleteResult = await savedCollection.deleteMany(query);

      // const filter={name:payment.name}
      // const findResult =await classesCollection.findOne(filter)
      // console.log(findResult)
      // const updateDoc ={
      //   $inc: {booking : 1}
      // }
      // const updateResult = await classesCollection.updateOne(findResult, updateDoc)
      //    console.log(updateResult)
      res.send({ insertResult, deleteResult });
    });


    app.put("/payment/:name", async (req, res) => {
      const name = req.params.name;
      console.log(name);
      const filter = { name:name };
      // const options = {upsert: true};
      const options ={upsert: true}
      const updateDoc = {
        //  seats: { $lt: 0 } ,
        $inc: {
          booking: 1,
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc, options);
      console.log(result)
      res.send(result);
    });


    app.get("/payment/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const query = { studentEmail: email };
      // console.log(query);
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

//sort with descending
    app.get("/history/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      // const createAt = new Date()
      const query = { studentEmail: email };
      // console.log(query);
      const result = await paymentCollection.find(query).sort({createdAt: -1}).toArray();
      res.send(result);
    });



    app.get('/payment', async (req, res)=>{
      const result = await paymentCollection.find().toArray();
      res.send(result);
    })


    

    // app.get("/admin-stats", verifyJWT, verifyAdmin, async (req, res) => {
    //   const users = await usersCollection.estimatedDocumentCount();
    //   const products = await menuCollection.estimatedDocumentCount();
    //   const orders = await paymentCollection.estimatedDocumentCount();
    //   const payments = await paymentCollection.find().toArray();
    //   const revenue = payments.reduce((sum, payment) => sum + payment.price, 0);
    //   //best way to sum of a field is to use group and sum operato
    //   res.send({
    //     users,
    //     products,
    //     orders,
    //     revenue,
    //   });
    // });

    // app.get("/order-stats", verifyJWT,verifyAdmin, async (req, res) => {
    //   const pipeline = [
    //     {
    //       $lookup: {
    //         from: 'menu',
    //         localField: 'menuItems',
    //         foreignField: '_id',
    //         as: 'menuItemsData'
    //       }
    //     },
    //     {
    //       $unwind: '$menuItemsData'
    //     },
    //     {
    //       $group: {
    //         _id: '$menuItemsData.category',
    //         count: { $sum: 1 },
    //         total: { $sum: '$menuItemsData.price' }
    //       }
    //     },
    //     {
    //       $project: {
    //         category: '$_id',
    //         count: 1,
    //         total: { $round: ['$total', 2] },
    //         _id: 0
    //       }
    //     }
    //   ];

    //   const result = await paymentCollection.aggregate(pipeline).toArray()
    //   res.send(result)
    // });





    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Sports Academic Running");
});

app.listen(port, () => {
  console.log(`Sports Academic Running Running on ${port}`);
});
