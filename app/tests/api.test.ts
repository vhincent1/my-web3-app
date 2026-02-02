import request from 'supertest';
import app from '../src/index.ts';

import { keypairUtils } from '@my-util-lib/utils';


describe('POST /api/account/withdraw', () => {
  it('should return a 200 status', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
  });

  // it('withdraw check', async () => {
  //   const newProductData = {
  //     address: 'Test Product',
  //     recipient: keypairUtils.generateKeypair().publicKey,
  //     amount: 0.01,
  //   };

  //   const res = await request(app)
  //     .post('/api/account/withdraw') // Specify the POST route
  //     .send(newProductData); // Send the data in the body

  //   console.log(res.statusCode);

  //   expect(1).toBe(1);

  //   // expect(res.statusCode).toBe(201); // Expect a 201 Created status

  //   // expect(res.body.name).toBe(newProductData.name);
  //   // expect(res.body.price).toBe(newProductData.price);
  //   // expect(res.body).toHaveProperty('id'); // Check if the response has an 'id'
  // });

  //   it('should return 400 if name or price is missing', async () => {
  //     const invalidProductData = {
  //       name: 'Test Product',
  //       // price is missing
  //     };

  //     const res = await request(app)
  //       .post('/api/products')
  //       .send(invalidProductData);

  //     expect(res.statusCode).toBe(400); // Expect a 400 Bad Request status
  //     expect(res.body).toHaveProperty('error');
  //     expect(res.body.error).toBe('Missing name or price');
  //   });
});
