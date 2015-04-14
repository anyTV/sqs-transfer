#!/usr/bin/env python2

'''
    This test add invalid json content. This are invalid request
    to add to the queue. This tests the servers capabilities
    to hold multiple and voluminous data requests
'''

import threading as threads
import random
import time
import requests as req
import ast
import json


def call(c, u, a, d, ca):
    z = {
            'created_at': ca,
            'user_id': u,
            'action': a,
            'description': d,
            'collection': c
        }

    del z[random.choice(z.keys())]

    r = req.post('http://192.168.30.151:5000/queue', data=z)
    j = ast.literal_eval(json.dumps(r.json()))

    y = {
            'message': 'Oke la',
            'sent': z
        }

    try:
        assert j == y, 'They are not the same'
        print('Passed: ' + random.choice('!@#$%^&*()_+}{":?><[];\'/.,=-\'"}'))
    except:
        print('================================================================')
        print('Actual')
        print(json.dumps(j))
        print('Expected')
        print(json.dumps(y))
        print('================================================================')


def main():
    try:
        with open('descriptions.txt') as f:
            descs = f.readlines()
    except Exception as e:
        print(e)
        exit(1)

    try:
        with open('users.txt') as f:
            users = f.readlines()
    except Exception as e:
        print(e)
        exit(1)

    tries = 0
    jobs = []

    while tries < 25000:
        if threads.activeCount() < 30:
            z = (
                    random.choice(['Test', 'Logs', 'Misc', 'Info']),
                    random.choice(users),
                    random.choice(['INSERT', 'UPDATE', 'DELETE']),
                    random.choice(descs),
                    str(int(time.time()) * 1000)
                )

            p = threads.Thread(target=call, args=z)
            p.start()
            jobs.append(p)
            tries += 1

    for j in jobs:
        j.join()

main()
