import React from 'react';
import { render } from 'react-dom';
import { HashRouter as Router, Route } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import Manager from './components/Manager';
import SettingsPage from './components/SettingsPage';
import 'bootstrap/dist/css/bootstrap.min.css';

import 'react-toastify/dist/ReactToastify.css';
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Since we are using HtmlWebpackPlugin WITHOUT a template, we should create our own root node in the body element before rendering into it
let root = document.createElement('div');

root.id = 'root';
document.body.appendChild(root);

// Now we can render our application into it
render(
  <Router>
    <div>
      <main>
        <Route exact path="/" component={LoginForm} />
        <Route path="/manager" component={Manager} />
        <Route path="/settings" component={SettingsPage} />
      </main>
    </div>
  </Router>,
  document.getElementById('root')
);
