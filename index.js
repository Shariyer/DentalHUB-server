/** @format */

const express = require("express");
const cors = require("cors");
const { application } = require("express");
const port = process.env.PORT || 5000;
const app = express();

// middle wares
app.use(cors());
app.use(express.json());
// requiring dotenv
require("dotenv").config();
// requiring jsonwebtoken
const jwt = require("jsonwebtoken");
// db connection

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dhtiicz.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// jwt function verification
const jwtVerification = (req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  // console.log(authorizationHeader);
  if (!authorizationHeader) {
    return res.status(401).send("access-unauthorized");
  }
  const receivedToken = authorizationHeader.split(" ")[1];
  jwt.verify(receivedToken, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });

  // console.log("only token", receivedToken);
};

async function run() {
  try {
    const appointmentOptionCollection = client
      .db("doctors-portal")
      .collection("appointmentOption");
    const bookingCollection = client
      .db("doctors-portal")
      .collection("bookings");
    const usersCollection = client.db("doctors-portal").collection("users");

    app.get("/appointmentOptions", async (req, res) => {
      const date = req.query.date;
      const query = {};
      const options = await appointmentOptionCollection.find(query).toArray();
      // console.log(options);
      const bookingQuery = { appointmentDate: date };
      const alreadyBookedDate = await bookingCollection
        .find(bookingQuery)
        .toArray();
      // console.log("Booked Date", alreadyBookedDate.date);
      options.forEach((option) => {
        const bookedTreatmentNames = alreadyBookedDate.filter(
          (singleBooking) => singleBooking.treatmentName === option.name
        );
        // console.log(option);
        // const names = bookedTreatmentNames.map(
        //   (singlet) => singlet.treatmentName
        // );

        const bookedSlotsOnBookedDate = bookedTreatmentNames.map(
          (singleBookingSlot) => singleBookingSlot.slot
        );
        const availableSlots = option.slots.filter(
          (slot) => !bookedSlotsOnBookedDate.includes(slot)
        );
        option.slots = availableSlots;
        // console.log(
        //   date,
        //   "TreatMent Name:" + names,
        //   bookedSlotsOnBookedDate,
        //   availableSlots.length
        // );
      });
      res.send(options);
    });

    app.get("/usersAppointments", jwtVerification, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      // console.log(email, decodedEmail, "jkjkjkj");
      if (decodedEmail !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      // console.log(email);
      const query = {
        email: email,
      };
      const usersAppointments = await bookingCollection.find(query).toArray();
      res.send(usersAppointments);
      // console.log(usersAppointments);
    });

    app.post("/booking", async (req, res) => {
      const booking = req.body;
      // console.log(booking);
      const bookingQuery = {
        appointmentDate: booking.appointmentDate,
        treatmentName: booking.treatmentName,
        email: booking.email,
      };
      const bookedByOneUser = await bookingCollection
        .find(bookingQuery)
        .toArray();
      if (bookedByOneUser.length) {
        const message = `You Already have a Booking ON:${booking.appointmentDate}`;
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingCollection.insertOne(booking);
      //   console.log(result);
      res.send(result);
    });

    // jwt token api
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      console.log(email, "Loged in user email");
      const query = {
        email: email,
      };
      const user = await usersCollection.findOne(query);

      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: " " });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.get("/users/userPatients", async (req, res) => {
      // const UserEmail = req.query.email;
      const query = {
        role: "userPatient",
      };
      const users = await usersCollection.find(query).toArray();
      console.log(users);
      res.send(users);
    });
    // admin role check and verify

    //  verifying admin by email
    // app.get("/users/adminCheck/:id", async (req, res) => {
    //   const id = req.params.id;
    //   console.log(id, " of admin");
    //   const email = req.query.email;
    //   console.log(email);
    //   const query = {}

    //   // const filter = { _id: ObjectId(id) };
    //   const users = await usersCollection.find(query).toArray();
    //   console.log(users);
    // });

    // setting admin role
    app.get("/users/adminCheck/:id", jwtVerification, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      // const user = await usersCollection.find(filter).toArray();
      console.log(user);
      // if (user.role !== "admin") {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      // const id = req.params.id;
      // const filter = { _id: ObjectId(id) };
      // const option = { upsert: true };
      // const updatedDoc = {
      //   $set: {
      //     role: "admin",
      //   },
      // };
      // const result = await usersCollection.updateOne(
      //   filter,
      //   updatedDoc,
      //   option
      // );
      // res.send(result);
    });
    app.patch("/users/updateApproval/:id", async (req, res) => {
      // const decodedEmail = req.decoded.email;
      // const query = { email: decodedEmail };
      // const user = await usersCollection.findOne(query).toArray();
      // if (user.role !== "admin") {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const userApprovalData = req.body;
      const id = req.params.id;

      const filter = { _id: ObjectId(id) };
      // console.log(userApprovalData, filter);c
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          approval: userApprovalData.approval,
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.send(result);
    });
    app.patch("/users/vugi/:id", async (req, res) => {
      // const decodedEmail = req.decoded.email;
      // const query = { email: decodedEmail };
      // const user = await usersCollection.findOne(query).toArray();
      // if (user.role !== "admin") {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const userApprovalData = req.body;
      const id = req.params.id;

      const filter = { _id: ObjectId(id) };
      // console.log(userApprovalData, filter);
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          approval: userApprovalData,
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.send(result);
    });
    app.delete("/users/deleteUser/:id", async (req, res) => {
      // const decodedEmail = req.decoded.email;
      // const query = { email: decodedEmail };
      // const user = await usersCollection.findOne(query).toArray();
      // if (user.role !== "admin") {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      // const userApprovalData = req.body;
      const id = req.params.id;

      const filter = { _id: ObjectId(id) };
      console.log(filter);

      const result = await usersCollection.deleteOne(filter);
      // console.log(result);

      res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch((err) => console.log(err));

// setting root api
app.get("/", async (req, res) => {
  res.send("Dental HUB Server is running successfully");
});
app.listen(port, async (req, res) => {
  console.log(`Server is running at port: ${port}`);
});
