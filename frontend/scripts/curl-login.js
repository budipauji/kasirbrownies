(async()=>{
  const { default: fetch } = await import('node-fetch');
  try{
    const resp = await fetch('http://localhost:3000/api/auth/sign-in/email',{method:'POST',
      headers:{'Content-Type':'application/json','Origin':'http://localhost:3000'},
      body:JSON.stringify({email:'chocofellas@mail.com', password:'felaniacantik'})
    });
    console.log('status',resp.status);
    console.log('body',await resp.json());
  }catch(e){console.error(e)}
})();
