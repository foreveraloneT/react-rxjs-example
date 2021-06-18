import React from 'react';
import { Subject, Observable, of } from 'rxjs'
import { debounceTime, switchMap, map, distinctUntilChanged, catchError } from 'rxjs/operators';
import axios from 'axios';

import logo from './logo.svg';
import './App.css';

function requestAPI(options) {
  return new Observable((subscriber) => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    
    const optionsWithCancel = {
      ...options,
      cancelToken: source.token,
    }

    axios.request(optionsWithCancel)
      .then(response => {
        subscriber.next(response.data);
        subscriber.complete();
      })
      .catch(error => {
        if (axios.isCancel(error)) {
          subscriber.complete();
        } else {
          subscriber.error(error);
        }
      })

    return () => {
      console.log('cancel');

      source.cancel()
    }
  });
}

function App() {
  const [search, setSearch] = React.useState('');
  const [search$] = React.useState(new Subject());
  const [list, setList] = React.useState([]);

  React.useEffect(() => {
    search$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((val => {
          const options = {
            method: 'GET',
            url: 'http://www.omdbapi.com',
            params: {
              apikey: process.env.REACT_APP_API_KEY,
              type: 'movie',
              s: val
            },
          };

          return requestAPI(options)
            .pipe(
              map(data => data.Search || []),
              catchError(of([])),
            )
        })),
      )
      .subscribe(result => {
        setList(result)
      });

      return () => {
        search$.unsubscribe();
      }
  }, [search$]);

  const onChange = React.useCallback((e) => {
    const { value } = e.target;
  
    setSearch(value);
    search$.next(value);
  }, [setSearch, search$]);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <input
          className="App-input"
          type="text"
          value={search}
          placeholder="Search movies..."
          onChange={onChange}
        />
        {
          list.map(item => (
            <div key={item.imdbID}>{ item.Title }</div>
          ))
        }
      </header>
    </div>
  );
}

export default App;
