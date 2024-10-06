const express = require("express");
const app = express();
const cors = require("cors");
const port = 3042;
const secp = require("ethereum-cryptography/secp256k1");
const { keccak256 } = require("ethereum-cryptography/keccak");
const { utf8ToBytes, toHex } = require("ethereum-cryptography/utils");

app.use(cors());
app.use(express.json());

const balances = {
  "025ef57024df3b7e11d43ea941c32edc82a8ac5054e2391c2c8bd0f188f3521fa9": 100,
  "02dce0a594d84f32a59cb4121969fd5d6b7008c37ae5c3fe5dd272ae11ec1953a3": 50,
  "0387a5fa46d667f8dc03cda1a6b4cbc1eef56326f80d68f8885f26765b61663b4b": 75,
};

const transactions = {
  "025ef57024df3b7e11d43ea941c32edc82a8ac5054e2391c2c8bd0f188f3521fa9": 4,
  "02dce0a594d84f32a59cb4121969fd5d6b7008c37ae5c3fe5dd272ae11ec1953a3": 2,
  "0387a5fa46d667f8dc03cda1a6b4cbc1eef56326f80d68f8885f26765b61663b4b": 1,
};

function hashMessage(message) {
  return keccak256(utf8ToBytes(message));
}

function setInitialBalance(address) {
  if (!balances[address.toLowerCase()]) {
    balances[address.toLowerCase()] = 0;
  }
  if (!transactions[address.toLowerCase()]) {
    transactions[address.toLowerCase()] = 0;
  }
}

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.get("/transactions/:address", (req, res) => {
  const { address } = req.params;
  const transaction = transactions[address] || 0;
  res.send({ transaction });
});

app.post("/send", (req, res) => {
  const { sender, recipient, amount, signature, recoveryBit } = req.body;

  setInitialBalance(sender.toLowerCase());
  setInitialBalance(recipient.toLowerCase());

  const document = {
    sender: sender.toLowerCase(),
    amount: parseInt(amount),
    id: parseInt(transactions[sender.toLowerCase()] + 1),
    recipient: recipient.toLowerCase(),
  };
  const pkey = secp.recoverPublicKey(
    hashMessage(JSON.stringify(document)),
    Uint8Array.from(signature.split(",")),
    parseInt(recoveryBit)
  );
  let address = keccak256(pkey.slice(1));
  address = `0x${toHex(address.slice(-20))}`;
  if (sender.toLowerCase() != address.toLowerCase()) {
    res.status(400).send({ message: "Wrong signature!" });
    return;
  }

  if (balances[sender.toLowerCase()] < amount) {
    res.status(400).send({ message: "Not enough funds!" });
    return;
  } else {
    balances[sender.toLowerCase()] -= amount;
    balances[recipient.toLowerCase()] += amount;
    transactions[sender.toLowerCase()]++;
    res.send({
      balance: balances[sender.toLowerCase()],
      transactions: transactions[sender.toLowerCase()],
    });
    return;
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});