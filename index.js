const express = require("express");
var admin = require("firebase-admin");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 3000;

// middleware
app.use(
  cors({
    origin: process.env.CLIENT_SITE,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(403).send({ message: "Forbidden" });
  }
};

const uri = process.env.DB_URI;

// firebase
const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    Buffer.from(base64, "base64").toString("utf-8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const allServicesCollection = client
      .db("ServiceReview")
      .collection("AllServices");

    const userCollection = client.db("ServiceReview").collection("user");
    const reviewCollection = client.db("ServiceReview").collection("review");

    app.get("/services", async (req, res) => {
      try {
        const { category, search } = req.query;

        let query = {};

        if (category && category.toLowerCase() !== "all") {
          query.category = { $regex: new RegExp(category, "i") };
        }

        if (search) {
          const searchRegex = new RegExp(search, "i");
          query.$or = [
            { title: searchRegex },
            { description: searchRegex },
            { companyName: searchRegex },
            { category: searchRegex },
          ];
        }

        const servicesCursor = await allServicesCollection.find(query);
        const services = await servicesCursor.toArray();
        const categories = await allServicesCollection.distinct("category");

        res.status(200).json({ services, categories });
      } catch (error) {
        console.error(" Error fetching services:", error);
        res.status(500).json({
          message: "Failed to fetch services",
          error: error.message,
        });
      }
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await allServicesCollection.findOne(query);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const id = req.query.id;

      const query = { serviceId: id };

      const result = await reviewCollection.find(query).toArray();

      if (result.length > 0) {
        res.send(result);
      } else {
        res.status(404).send({ error: "review not found" });
      }
    });

    app.post("/allServices", verifyToken, async (req, res) => {
      const data = req.body;

      try {
        const result = await allServicesCollection.insertOne(data);

        res.status(201).json({
          message: "Service added successfully",
          insertedId: result.insertedId,
        });
      } catch (err) {
        res
          .status(500)
          .json({ error: "Failed to add service", details: error.message });
      }
    });

    app.get("/my-service/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      const filter = { userEmail: email };

      const result = await allServicesCollection.find(filter).toArray();
      res.send(result);
    });

    app.get("/my-review", verifyToken, async (req, res) => {
      const { email } = req.query;

      const filter = { email: email };

      const result = await reviewCollection.find(filter).toArray();
      res.send(result);
    });

    app.get("/user", async (req, res) => {
      const email = req.query;

      try {
        const users = await userCollection.findOne(email);
        res.send(users);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    app.get("/counts", async (req, res) => {
      const reviewCount = await reviewCollection.countDocuments();
      const userCount = await userCollection.countDocuments();
      const serviceCount = await allServicesCollection.countDocuments();

      res.json({ reviewCount, userCount, serviceCount });
    });
    app.post("/user", async (req, res) => {
      const userData = req.body;

      try {
        const result = await userCollection.insertOne(userData);

        res.status(201).json({
          message: "User added successfully",
          insertedId: result.insertedId,
        });
      } catch (err) {
        res
          .status(500)
          .json({ error: "Failed to add user", details: error.message });
      }
    });

    app.get("/featured", async (req, res) => {
      const service = await allServicesCollection
        .find({})
        .sort({ reviewCount: -1, rating: -1 })
        .limit(8)
        .toArray();

      res.json(service);
    });

    // home page latest review
    app.get("/latest-review", async (req, res) => {
      try {
        const latestReviews = await reviewCollection
          .find()
          .sort({ date: -1 })
          .limit(6)
          .toArray();

        const totalReviews = await reviewCollection.countDocuments();

        const goodReviews = await reviewCollection.countDocuments({
          rating: { $gte: 4 },
        });
        const badReviews = await reviewCollection.countDocuments({
          rating: { $lte: 2 },
        });

        res.json({
          latestReviews,
          stats: {
            totalReviews,
            goodReviews,
            badReviews,
          },
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    app.post("/review", verifyToken, async (req, res) => {
      const review = req.body;
      const { serviceId, rating } = review;

      try {
        const result = await reviewCollection.insertOne(review);

        const allReviews = await reviewCollection.find({ serviceId }).toArray();

        const totalRating = allReviews.reduce(
          (acc, cur) => acc + cur.rating,
          0
        );
        const reviewCount = allReviews.length;
        const averageRating = totalRating / reviewCount;

        await allServicesCollection.updateOne(
          { _id: new ObjectId(serviceId) },
          {
            $set: {
              rating: averageRating,
              reviewCount: reviewCount,
            },
          }
        );

        res.status(201).json({
          message: "Review added and service updated",
          insertedId: result.insertedId,
        });
      } catch (err) {
        res.status(500).json({
          error: "Failed to add review",
          details: err.message,
        });
      }
    });

    app.patch("/review/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { rating, text } = req.body;

      const filter = { _id: new ObjectId(id) };

      const document = {
        $set: {
          rating,
          text,
        },
      };
      const result = await reviewCollection.updateOne(filter, document);

      // updating the service review
      const currentReview = await reviewCollection.findOne({
        _id: new ObjectId(id),
      });
      const serviceId = currentReview.serviceId;

      const allReviews = await reviewCollection.find({ serviceId }).toArray();

      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = totalRating / allReviews.length;

      await allServicesCollection.updateOne(
        { _id: new ObjectId(serviceId) },
        { $set: { rating: averageRating.toFixed(1) } }
      );

      res.send({ message: "Review updated and service rating updated." });
    });

    app.patch("/my-service", verifyToken, async (req, res) => {
      const { _id, serviceImage, serviceTitle, price, category } = req.body;

      const filter = { _id: new ObjectId(_id) };
      const document = {
        $set: {
          serviceImage,
          serviceTitle,
          price,
          category,
        },
      };

      const result = await allServicesCollection.updateOne(filter, document);
      res.send(result);
    });

    app.delete("/my-service", verifyToken, async (req, res) => {
      const { _id } = req.body;

      const filter = { _id: new ObjectId(_id) };

      const result = await allServicesCollection.deleteOne(filter);
      res.send(result);
    });

    app.delete("/review/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      const query = { _id: new ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);

      res.send(result);
    });

    // Send a ping to confirm a successful connection
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
  res.send(" Service Review System Server is running!");
});

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});
